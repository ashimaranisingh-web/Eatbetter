import Foundation
import UIKit
import Capacitor
import WidgetKit
import AVFoundation

/// Small native helpers for Menu-fi (JS name "Menufi", used by native.js):
///  - updateWidget: saves the next two weeks of cycle days + today's meals
///    into the shared App Group so the home/lock screen widget can show them.
///  - haptic: a light tap when something is logged.
///  - shareImage: opens the iOS share sheet with a PNG (the weekly poster).
///  - scanBarcode: full-screen camera that reads a food pack's barcode
///    (EAN-13/8, UPC) and returns its digits. Apple's own reader, no add-ons.
@objc(MenufiPlugin)
public class MenufiPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MenufiPlugin"
    public let jsName = "Menufi"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateWidget", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "haptic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scanBarcode", returnType: CAPPluginReturnPromise)
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

    @objc func scanBarcode(_ call: CAPPluginCall) {
        guard AVCaptureDevice.default(for: .video) != nil else { call.reject("No camera on this device", "NO_CAMERA"); return }
        let present = {
            DispatchQueue.main.async {
                guard let vc = self.bridge?.viewController else { call.reject("no view"); return }
                let scanner = BarcodeScannerViewController()
                scanner.onFinish = { code in
                    if let code = code {
                        UINotificationFeedbackGenerator().notificationOccurred(.success)
                        call.resolve(["code": code])
                    } else {
                        call.resolve(["cancelled": true])
                    }
                }
                scanner.modalPresentationStyle = .fullScreen
                vc.present(scanner, animated: true)
            }
        }
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: present()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { ok in
                if ok { present() } else { call.reject("denied", "CAMERA_DENIED") }
            }
        default: call.reject("denied", "CAMERA_DENIED")
        }
    }
}

/// Camera view with a guide box, a hint and Cancel. Closes on the first barcode read.
final class BarcodeScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onFinish: ((String?) -> Void)?
    private let session = AVCaptureSession()
    private var preview: AVCaptureVideoPreviewLayer?
    private var done = false
    private let box = UIView()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input) else { finish(nil); return }
        session.addInput(input)
        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else { finish(nil); return }
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        let wanted: [AVMetadataObject.ObjectType] = [.ean13, .ean8, .upce, .code128]
        output.metadataObjectTypes = wanted.filter { output.availableMetadataObjectTypes.contains($0) }

        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(layer)
        preview = layer

        box.layer.borderColor = UIColor.white.cgColor
        box.layer.borderWidth = 2
        box.layer.cornerRadius = 12
        view.addSubview(box)

        let hint = UILabel()
        hint.text = "Point at the barcode on the pack"
        hint.textColor = .white
        hint.font = .systemFont(ofSize: 17, weight: .semibold)
        hint.textAlignment = .center
        hint.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(hint)

        var look = UIButton.Configuration.filled()
        look.title = "Cancel"
        look.baseBackgroundColor = UIColor(white: 0, alpha: 0.55)
        look.baseForegroundColor = .white
        look.cornerStyle = .capsule
        look.contentInsets = NSDirectionalEdgeInsets(top: 0, leading: 28, bottom: 0, trailing: 28)
        let cancel = UIButton(configuration: look)
        cancel.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        cancel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(cancel)

        NSLayoutConstraint.activate([
            hint.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            hint.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            hint.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 32),
            cancel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            cancel.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
            cancel.heightAnchor.constraint(equalToConstant: 48)
        ])
        DispatchQueue.global(qos: .userInitiated).async { self.session.startRunning() }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        preview?.frame = view.bounds
        let w = min(view.bounds.width - 64, 320)
        box.frame = CGRect(x: (view.bounds.width - w) / 2, y: view.bounds.midY - w * 0.3, width: w, height: w * 0.6)
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput objects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard !done, let obj = objects.first as? AVMetadataMachineReadableCodeObject, let code = obj.stringValue, !code.isEmpty else { return }
        finish(code)
    }

    @objc private func cancelTapped() { finish(nil) }

    private func finish(_ code: String?) {
        guard !done else { return }
        done = true
        if session.isRunning { DispatchQueue.global(qos: .userInitiated).async { self.session.stopRunning() } }
        DispatchQueue.main.async {
            if self.presentingViewController != nil {
                self.dismiss(animated: true) { self.onFinish?(code) }
            } else {
                self.onFinish?(code)
            }
        }
    }

    override var prefersStatusBarHidden: Bool { true }
}
