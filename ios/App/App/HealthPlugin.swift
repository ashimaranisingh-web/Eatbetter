import Foundation
import Capacitor
import HealthKit

/// Apple Health bridge for Menu-fi (JS name "Health", used by health.js).
/// Reads weight, period days and workouts; writes each day's eaten
/// calories and macros, replacing that day's earlier totals.
@objc(HealthPlugin)
public class HealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthPlugin"
    public let jsName = "Health"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "latestWeight", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "periodStarts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "workouts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveDailyNutrition", returnType: CAPPluginReturnPromise)
    ]

    private let store = HKHealthStore()

    private static let nutrition: [(key: String, id: HKQuantityTypeIdentifier, unit: HKUnit)] = [
        ("cal", .dietaryEnergyConsumed, .kilocalorie()),
        ("p", .dietaryProtein, .gram()),
        ("c", .dietaryCarbohydrates, .gram()),
        ("f", .dietaryFatTotal, .gram()),
        ("fib", .dietaryFiber, .gram())
    ]

    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()
    private static func isoDay(_ d: Date) -> String { dayFormatter.string(from: d) }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Health data is not available on this device")
            return
        }
        let write = Set(HealthPlugin.nutrition.compactMap { HKQuantityType.quantityType(forIdentifier: $0.id) as HKSampleType? })
        var read: Set<HKObjectType> = [HKObjectType.workoutType()]
        [HKQuantityType.quantityType(forIdentifier: .bodyMass),
         HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)].compactMap { $0 }.forEach { read.insert($0) }
        if let flow = HKCategoryType.categoryType(forIdentifier: .menstrualFlow) { read.insert(flow) }
        write.forEach { read.insert($0) }

        store.requestAuthorization(toShare: write, read: read) { ok, error in
            if let error = error { call.reject(error.localizedDescription); return }
            call.resolve(["completed": ok])
        }
    }

    @objc func latestWeight(_ call: CAPPluginCall) {
        guard let type = HKQuantityType.quantityType(forIdentifier: .bodyMass) else { call.resolve([:]); return }
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, error in
            if let error = error { call.reject(error.localizedDescription); return }
            guard let sample = samples?.first as? HKQuantitySample else { call.resolve([:]); return }
            call.resolve([
                "kg": sample.quantity.doubleValue(for: .gramUnit(with: .kilo)),
                "date": HealthPlugin.isoDay(sample.endDate)
            ])
        }
        store.execute(query)
    }

    /// First day of each period in the last `days` days, oldest first.
    /// A day counts as a start when Health marks it as one, or when it
    /// follows a gap of more than 2 days without flow.
    @objc func periodStarts(_ call: CAPPluginCall) {
        guard let type = HKCategoryType.categoryType(forIdentifier: .menstrualFlow) else { call.resolve(["starts": []]); return }
        let days = call.getInt("days") ?? 200
        let cal = Calendar.current
        let from = cal.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        let predicate = HKQuery.predicateForSamples(withStart: from, end: Date(), options: [])
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sort]) { _, samples, error in
            if let error = error { call.reject(error.localizedDescription); return }
            var starts: [String] = []
            var previous: Date?
            for case let sample as HKCategorySample in samples ?? [] {
                if sample.value == HKCategoryValueMenstrualFlow.none.rawValue { continue }
                let day = cal.startOfDay(for: sample.startDate)
                let marked = (sample.metadata?[HKMetadataKeyMenstrualCycleStart] as? NSNumber)?.boolValue == true
                let gap = previous.map { cal.dateComponents([.day], from: $0, to: day).day ?? 0 } ?? Int.max
                if marked || gap > 2 {
                    let iso = HealthPlugin.isoDay(day)
                    if starts.last != iso { starts.append(iso) }
                }
                previous = day
            }
            call.resolve(["starts": starts])
        }
        store.execute(query)
    }

    @objc func workouts(_ call: CAPPluginCall) {
        let since = call.getString("since").flatMap { HealthPlugin.dayFormatter.date(from: $0) }
            ?? Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
        let predicate = HKQuery.predicateForSamples(withStart: since, end: Date(), options: [])
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        let iso = ISO8601DateFormatter()
        let query = HKSampleQuery(sampleType: HKObjectType.workoutType(), predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sort]) { _, samples, error in
            if let error = error { call.reject(error.localizedDescription); return }
            let list: [[String: Any]] = (samples ?? []).compactMap { $0 as? HKWorkout }.map { w in
                [
                    "id": w.uuid.uuidString,
                    "name": HealthPlugin.name(for: w.workoutActivityType),
                    "date": HealthPlugin.isoDay(w.startDate),
                    "start": iso.string(from: w.startDate),
                    "minutes": Int(w.duration / 60),
                    "kcal": HealthPlugin.activeKcal(w)
                ]
            }
            call.resolve(["workouts": list])
        }
        store.execute(query)
    }

    /// Replaces the day's nutrition totals: earlier samples written for the
    /// same day are deleted (matched by sync identifier) before saving.
    @objc func saveDailyNutrition(_ call: CAPPluginCall) {
        guard let dateStr = call.getString("date"), let day = HealthPlugin.dayFormatter.date(from: dateStr) else {
            call.reject("date must be yyyy-MM-dd")
            return
        }
        let when = Calendar.current.date(byAdding: .hour, value: 12, to: day) ?? day
        let version = NSNumber(value: Int(Date().timeIntervalSince1970))
        let group = DispatchGroup()
        var failure: String?
        let lock = NSLock()

        for item in HealthPlugin.nutrition {
            guard let type = HKQuantityType.quantityType(forIdentifier: item.id) else { continue }
            let syncId = "menufi-\(dateStr)-\(item.key)"
            let value = call.getDouble(item.key) ?? 0
            let existing = HKQuery.predicateForObjects(withMetadataKey: HKMetadataKeySyncIdentifier, allowedValues: [syncId])
            group.enter()
            store.deleteObjects(of: type, predicate: existing) { _, _, _ in
                guard value > 0 else { group.leave(); return }
                let sample = HKQuantitySample(
                    type: type,
                    quantity: HKQuantity(unit: item.unit, doubleValue: value),
                    start: when, end: when,
                    metadata: [HKMetadataKeySyncIdentifier: syncId, HKMetadataKeySyncVersion: version]
                )
                self.store.save(sample) { _, error in
                    if let error = error { lock.lock(); failure = error.localizedDescription; lock.unlock() }
                    group.leave()
                }
            }
        }
        group.notify(queue: .main) {
            if let failure = failure { call.reject(failure) } else { call.resolve() }
        }
    }

    private static func activeKcal(_ w: HKWorkout) -> Double {
        if #available(iOS 16.0, *), let type = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) {
            return w.statistics(for: type)?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
        }
        return w.totalEnergyBurned?.doubleValue(for: .kilocalorie()) ?? 0
    }

    private static func name(for type: HKWorkoutActivityType) -> String {
        switch type {
        case .running: return "Running"
        case .walking: return "Walking"
        case .hiking: return "Hiking"
        case .cycling: return "Cycling"
        case .swimming: return "Swimming"
        case .traditionalStrengthTraining, .functionalStrengthTraining: return "Strength training"
        case .coreTraining: return "Core training"
        case .highIntensityIntervalTraining: return "HIIT"
        case .yoga: return "Yoga"
        case .pilates: return "Pilates"
        case .cardioDance, .socialDance: return "Dance"
        case .badminton: return "Badminton"
        case .tennis: return "Tennis"
        case .elliptical: return "Elliptical"
        case .stairClimbing: return "Stairs"
        case .mixedCardio: return "Cardio"
        default: return "Workout"
        }
    }
}
