import Foundation
import UIKit
import Capacitor
import WidgetKit

/// Small native helpers for Menu-fi (JS name "Menufi", used by native.js):
///  - updateWidget: saves the next two weeks of cycle days + today's meals
///    into the shared App Group so the home/lock screen widget can show them.
///  - haptic: a light tap when something is logged.
///  - shareImage: opens the iOS share sheet with a PNG (the weekly poster).
@objc(MenufiPlugin)
public class MenufiPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MenufiPlugin"
    public let jsName = "Menufi"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateWidget", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "haptic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareImage", returnType: CAPPluginReturnPromise)
    ]

    static let appGroup = "group.com.ashimaranisingh.menufi"
    static let widgetKey = "widgetData"

    @objc func updateWidget(_ call: CAPPluginCall) {
        guard let json = call.getString("json"),
              let defaults = UserDefaults(suiteName: MenufiPlugin.appGroup) else {
            call.reject("unavailable"); return
        }
        defaults.set(json, forKey: MenufiPlugin.widgetKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func haptic(_ call: CAPPluginCall) {
        let style = call.getString("style") ?? "light"
        DispatchQueue.main.async {
            if style == "success" {
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            } else {
                let g = UIImpactFeedbackGenerator(style: style == "medium" ? .medium : .light)
                g.impactOccurred()
            }
            call.resolve()
        }
    }

    @objc func shareImage(_ call: CAPPluginCall) {
        guard var b64 = call.getString("base64") else { call.reject("missing image"); return }
        if let comma = b64.firstIndex(of: ",") { b64 = String(b64[b64.index(after: comma)...]) }
        guard let data = Data(base64Encoded: b64), let image = UIImage(data: data) else {
            call.reject("bad image"); return
        }
        DispatchQueue.main.async {
            guard let vc = self.bridge?.viewController else { call.reject("no view"); return }
            let sheet = UIActivityViewController(activityItems: [image], applicationActivities: nil)
            sheet.popoverPresentationController?.sourceView = vc.view
            sheet.completionWithItemsHandler = { _, done, _, _ in call.resolve(["shared": done]) }
            vc.present(sheet, animated: true)
        }
    }
}
