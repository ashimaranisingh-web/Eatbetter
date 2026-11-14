import WidgetKit
import SwiftUI

// Menu-fi widget: what to eat next and today's workout, with the cycle day
// as a small line on top. Shown on the home and
// lock screen. The app writes the data (MenufiPlugin.updateWidget) into the
// shared App Group as JSON: two weeks of days, so the widget stays right
// even on days the app isn't opened, plus today's meal times.

private let appGroup = "group.com.ashimaranisingh.menufi"

struct WidgetDay: Codable {
    let d: String          // "2026-11-13"
    let day: Int           // day of cycle
    let label: String      // "Ovulation"
    let color: String      // phase colour, "#43a047"
    let deep: String       // darker phase colour for backgrounds
    let periodIn: Int?     // days until next period
}
struct WidgetMeal: Codable {
    let slot: String       // "Lunch"
    let time: String       // "1–2pm"
    let start: Double      // hour, 13
    let end: Double        // hour, 14
    let name: String       // meal name, or "460–560 cal" on Guide days
    let detail: String?    // "About 527 cal"
    let logged: Bool
}
struct WidgetWorkout: Codable {
    let name: String       // "30 min walk", or what she logged
    let detail: String?    // "About 120 cal" / "210 cal burned"
    let done: Bool
    let guess: Bool?       // suggested before she set her energy
}
struct WidgetData: Codable {
    let name: String?
    let days: [WidgetDay]
    let mealsDate: String?
    let meals: [WidgetMeal]
    let workout: WidgetWorkout?
}

private func loadData() -> WidgetData? {
    guard let json = UserDefaults(suiteName: appGroup)?.string(forKey: "widgetData"),
          let raw = json.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(WidgetData.self, from: raw)
}

private let isoFormatter: DateFormatter = {
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.locale = Locale(identifier: "en_US_POSIX")
    f.timeZone = .current
    f.dateFormat = "yyyy-MM-dd"
    return f
}()

struct MenufiEntry: TimelineEntry {
    let date: Date
    let day: WidgetDay?
    let next: WidgetMeal?
    let allLogged: Bool
    let workout: WidgetWorkout?
}

private func entry(at date: Date, data: WidgetData?) -> MenufiEntry {
    let key = isoFormatter.string(from: date)
    let day = data?.days.first { $0.d == key }
    var next: WidgetMeal? = nil
    var allLogged = false
    if let data, data.mealsDate == key {
        let c = Calendar.current.dateComponents([.hour, .minute], from: date)
        let hour = Double(c.hour ?? 0) + Double(c.minute ?? 0) / 60
        let open = data.meals.filter { !$0.logged }
        next = open.first { $0.end > hour } ?? open.last
        allLogged = !data.meals.isEmpty && open.isEmpty
    }
    let workout = data?.mealsDate == key ? data?.workout : nil
    return MenufiEntry(date: date, day: day, next: next, allLogged: allLogged, workout: workout)
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> MenufiEntry {
        MenufiEntry(date: .now,
                    day: WidgetDay(d: "", day: 13, label: "Ovulation", color: "#43a047", deep: "#2e6b31", periodIn: 15),
                    next: WidgetMeal(slot: "Lunch", time: "1–2pm", start: 13, end: 14, name: "Dal, rice and greens", detail: "About 450 cal", logged: false),
                    allLogged: false,
                    workout: WidgetWorkout(name: "45 min strength", detail: "About 270 cal", done: false, guess: false))
    }
    func getSnapshot(in context: Context, completion: @escaping (MenufiEntry) -> Void) {
        let data = loadData()
        completion(data == nil ? placeholder(in: context) : entry(at: .now, data: data))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<MenufiEntry>) -> Void) {
        let data = loadData()
        let cal = Calendar.current
        let now = Date()
        var dates: [Date] = [now]
        // Refresh when each of today's meal windows ends…
        for m in data?.meals ?? [] {
            if let t = cal.date(bySettingHour: Int(m.end), minute: Int((m.end.truncatingRemainder(dividingBy: 1)) * 60), second: 0, of: now), t > now {
                dates.append(t)
            }
        }
        // …and at each midnight for the days the app sent.
        var midnight = cal.startOfDay(for: now)
        for _ in 0..<14 {
            midnight = cal.date(byAdding: .day, value: 1, to: midnight)!
            dates.append(midnight)
        }
        let entries = dates.sorted().map { entry(at: $0, data: data) }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

extension Color {
    init(hex: String) {
        var v: UInt64 = 0
        Scanner(string: hex.replacingOccurrences(of: "#", with: "")).scanHexInt64(&v)
        self.init(red: Double((v >> 16) & 0xff) / 255, green: Double((v >> 8) & 0xff) / 255, blue: Double(v & 0xff) / 255)
    }
}

// ── Views ──
// Food and workout lead; the cycle day is a small line at the top.

struct DayLine: View {
    let day: WidgetDay?
    var body: some View {
        HStack(spacing: 5) {
            if let d = day {
                Circle().fill(Color(hex: d.color)).frame(width: 7, height: 7)
                    .overlay(Circle().stroke(Color.white.opacity(0.9), lineWidth: 1))
                Text("Day \(d.day) · \(d.label)")
            } else {
                Text("Menu-fi")
            }
        }
        .font(.system(size: 11, weight: .semibold))
        .opacity(0.85)
        .lineLimit(1)
    }
}

struct Kicker: View {
    let text: String
    var body: some View {
        Text(text.uppercased()).font(.system(size: 10, weight: .semibold)).tracking(0.6).opacity(0.7).lineLimit(1)
    }
}

struct MealBlock: View {
    let entry: MenufiEntry
    var nameSize: CGFloat = 15
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            if let m = entry.next {
                Kicker(text: m.time.isEmpty ? "Next · \(m.slot)" : "\(m.slot) · \(m.time)")
                Text(m.name).font(.system(size: nameSize, weight: .semibold)).lineLimit(2).minimumScaleFactor(0.85)
                if let d = m.detail { Text(d).font(.system(size: 11, weight: .medium)).opacity(0.8).lineLimit(1) }
            } else if entry.allLogged {
                Kicker(text: "Food")
                Text("All meals logged").font(.system(size: nameSize, weight: .semibold))
            } else {
                Kicker(text: "Food")
                Text("Open Menu-fi for today’s meals").font(.system(size: 13, weight: .medium)).opacity(0.85)
            }
        }
    }
}

struct WorkoutBlock: View {
    let workout: WidgetWorkout?
    var compact = false
    var body: some View {
        if let w = workout {
            if compact {
                HStack(spacing: 5) {
                    Image(systemName: w.done ? "checkmark.circle.fill" : "figure.run")
                        .font(.system(size: 11, weight: .semibold))
                    Text(w.done ? "Done · \(w.name)" : w.name).font(.system(size: 12, weight: .medium)).lineLimit(1)
                }
            } else {
                VStack(alignment: .leading, spacing: 2) {
                    Kicker(text: w.done ? "Workout · done" : (w.guess == true ? "Workout · suggested" : "Workout today"))
                    HStack(spacing: 5) {
                        Image(systemName: w.done ? "checkmark.circle.fill" : "figure.run").font(.system(size: 13, weight: .semibold))
                        Text(w.name).font(.system(size: 15, weight: .semibold)).lineLimit(2).minimumScaleFactor(0.85)
                    }
                    if let d = w.detail { Text(d).font(.system(size: 11, weight: .medium)).opacity(0.8).lineLimit(1) }
                }
            }
        } else {
            Text("Open Menu-fi for a workout").font(.system(size: 12, weight: .medium)).opacity(0.85)
        }
    }
}

struct MenufiWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: MenufiEntry

    var bg: Color { entry.day.map { Color(hex: $0.deep) } ?? Color(hex: "#2e6b31") }

    var body: some View {
        content
            .foregroundStyle(family.isAccessory ? Color.primary : Color.white)
            .containerBackground(for: .widget) {
                if family.isAccessory { Color.clear } else {
                    LinearGradient(colors: [bg, bg.opacity(0.82)], startPoint: .top, endPoint: .bottom)
                }
            }
    }

    @ViewBuilder var content: some View {
        switch family {
        case .accessoryInline:
            if let m = entry.next { Text("\(m.slot): \(m.name)") }
            else if let w = entry.workout { Text(w.name) }
            else if let d = entry.day { Text("Day \(d.day) · \(d.label)") } else { Text("Menu-fi") }
        case .accessoryCircular:
            if let d = entry.day {
                VStack(spacing: -2) {
                    Text("DAY").font(.system(size: 9, weight: .semibold))
                    Text("\(d.day)").font(.system(size: 22, weight: .bold)).monospacedDigit()
                }
            } else { Image(systemName: "fork.knife") }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                if let m = entry.next {
                    Text("\(m.slot) · \(m.time)").font(.system(size: 13, weight: .bold)).lineLimit(1)
                    Text(m.name).font(.system(size: 12)).lineLimit(1)
                } else if entry.allLogged {
                    Text("All meals logged").font(.system(size: 13, weight: .bold))
                } else {
                    Text("Menu-fi").font(.system(size: 13, weight: .bold))
                }
                WorkoutBlock(workout: entry.workout, compact: true)
            }
        case .systemMedium:
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    DayLine(day: entry.day)
                    Spacer(minLength: 8)
                    if let p = entry.day?.periodIn, p > 0 {
                        Text(p == 1 ? "Period due tomorrow" : "Period in \(p) days")
                            .font(.system(size: 11, weight: .medium)).opacity(0.8).lineLimit(1)
                    }
                }
                Spacer(minLength: 0)
                HStack(alignment: .top, spacing: 12) {
                    MealBlock(entry: entry).frame(maxWidth: .infinity, alignment: .leading)
                    Rectangle().fill(Color.white.opacity(0.25)).frame(width: 1)
                    WorkoutBlock(workout: entry.workout).frame(maxWidth: .infinity, alignment: .leading)
                }
                .fixedSize(horizontal: false, vertical: true)
            }
        default:
            VStack(alignment: .leading, spacing: 6) {
                DayLine(day: entry.day)
                Spacer(minLength: 0)
                MealBlock(entry: entry, nameSize: 14)
                Rectangle().fill(Color.white.opacity(0.25)).frame(height: 1)
                WorkoutBlock(workout: entry.workout, compact: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

extension WidgetFamily {
    var isAccessory: Bool {
        self == .accessoryInline || self == .accessoryCircular || self == .accessoryRectangular
    }
}

struct MenufiWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "MenufiWidget", provider: Provider()) { entry in
            MenufiWidgetView(entry: entry)
        }
        .configurationDisplayName("Your day")
        .description("What to eat next and today’s workout, with your cycle day.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular, .accessoryInline])
    }
}

@main
struct MenufiWidgetBundle: WidgetBundle {
    var body: some Widget { MenufiWidget() }
}
