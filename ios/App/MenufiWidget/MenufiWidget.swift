import WidgetKit
import SwiftUI

// Menu-fi widget: cycle day + phase, and the next meal, on the home and
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
    let name: String       // meal name
    let logged: Bool
}
struct WidgetData: Codable {
    let name: String?
    let days: [WidgetDay]
    let mealsDate: String?
    let meals: [WidgetMeal]
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
    return MenufiEntry(date: date, day: day, next: next, allLogged: allLogged)
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> MenufiEntry {
        MenufiEntry(date: .now,
                    day: WidgetDay(d: "", day: 13, label: "Ovulation", color: "#43a047", deep: "#2e6b31", periodIn: 15),
                    next: WidgetMeal(slot: "Lunch", time: "1–2pm", start: 13, end: 14, name: "Dal, rice and greens", logged: false),
                    allLogged: false)
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

struct BigDay: View {
    let day: WidgetDay
    var size: CGFloat = 56
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("DAY").font(.system(size: 11, weight: .semibold)).tracking(1.5).opacity(0.75)
            Text("\(day.day)").font(.system(size: size, weight: .heavy)).monospacedDigit()
                .minimumScaleFactor(0.6).lineLimit(1)
            Text(day.label.uppercased()).font(.system(size: 13, weight: .heavy)).tracking(1.2)
                .lineLimit(1).minimumScaleFactor(0.7)
        }
    }
}

struct NextMealView: View {
    let entry: MenufiEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            if let m = entry.next {
                Text("NEXT · \(m.slot.uppercased()) · \(m.time)").font(.system(size: 10, weight: .semibold)).tracking(0.6).opacity(0.75)
                Text(m.name).font(.system(size: 14, weight: .semibold)).lineLimit(2)
            } else if entry.allLogged {
                Text("All meals logged today").font(.system(size: 13, weight: .semibold))
            } else {
                Text("Open Menu-fi for today’s meals").font(.system(size: 12, weight: .medium)).opacity(0.8)
            }
        }
    }
}

struct EmptyView2: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Menu-fi").font(.system(size: 15, weight: .heavy))
            Text("Add your last period date in the app to see your cycle day here.")
                .font(.system(size: 12)).opacity(0.85)
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
            if let d = entry.day { Text("Day \(d.day) · \(d.label)") } else { Text("Menu-fi") }
        case .accessoryCircular:
            if let d = entry.day {
                VStack(spacing: -2) {
                    Text("DAY").font(.system(size: 9, weight: .semibold))
                    Text("\(d.day)").font(.system(size: 24, weight: .heavy)).monospacedDigit()
                }
            } else { Image(systemName: "drop") }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                if let d = entry.day {
                    Text("Day \(d.day) · \(d.label)").font(.system(size: 15, weight: .heavy))
                } else { Text("Menu-fi").font(.system(size: 15, weight: .heavy)) }
                if let m = entry.next {
                    Text("\(m.slot) · \(m.time)").font(.system(size: 12, weight: .semibold))
                    Text(m.name).font(.system(size: 12)).lineLimit(1)
                } else if entry.allLogged {
                    Text("All meals logged").font(.system(size: 12))
                }
            }
        case .systemMedium:
            if let d = entry.day {
                HStack(alignment: .top, spacing: 16) {
                    BigDay(day: d, size: 64)
                    VStack(alignment: .leading, spacing: 8) {
                        NextMealView(entry: entry)
                        Spacer(minLength: 0)
                        if let p = d.periodIn, p > 0 {
                            Text(p == 1 ? "Period due tomorrow" : "Period in \(p) days").font(.system(size: 12, weight: .medium)).opacity(0.85)
                        }
                    }
                    Spacer(minLength: 0)
                }
            } else { EmptyView2() }
        default:
            if let d = entry.day {
                VStack(alignment: .leading, spacing: 6) {
                    BigDay(day: d, size: 52)
                    Spacer(minLength: 0)
                    if let m = entry.next {
                        Text("\(m.slot) · \(m.time)").font(.system(size: 11, weight: .semibold)).opacity(0.85).lineLimit(1)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } else { EmptyView2() }
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
        .description("Your cycle day and what to eat next.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular, .accessoryInline])
    }
}

@main
struct MenufiWidgetBundle: WidgetBundle {
    var body: some Widget { MenufiWidget() }
}
