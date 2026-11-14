import Foundation
import UIKit
import Capacitor
import WidgetKit
import AVFoundation
import Vision

/// Small native helpers for Menu-fi (JS name "Menufi", used by native.js):
///  - updateWidget: saves the next two weeks of cycle days + today's meals
///    into the shared App Group so the home/lock screen widget can show them.
///  - haptic: a light tap when something is logged.
///  - shareImage: opens the iOS share sheet with a PNG (the weekly poster).
///  - scanBarcode: full-screen camera that reads a food pack's barcode
///    (EAN-13/8, UPC) and returns its digits. Apple's own reader, no add-ons.
///  - readLabel: photo of a pack's nutrition panel (camera or Photos), read
///    on the phone with Vision. Returns the text as rows, left to right.
@objc(MenufiPlugin)
public class MenufiPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MenufiPlugin"
    public let jsName = "Menufi"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateWidget", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "haptic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareImage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scanBarcode", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readLabel", returnType: CAPPluginReturnPromise)
    ]
    private var labelReader: LabelReader?

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

    @objc func readLabel(_ call: CAPPluginCall) {
        let camera = (call.getString("source") ?? "camera") == "camera"
        let start = {
            DispatchQueue.main.async {
                guard let vc = self.bridge?.viewController else { call.reject("no view"); return }
                let reader = LabelReader()
                self.labelReader = reader
                reader.done = { image in
                    self.labelReader = nil
                    guard let image = image else { call.resolve(["cancelled": true]); return }
                    let thumb = LabelReader.thumbnail(image)
                    LabelReader.read(image) { rows in call.resolve(["rows": rows, "image": thumb]) }
                }
                reader.present(from: vc, camera: camera)
            }
        }
        guard camera else { start(); return }
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: start()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { ok in
                if ok { start() } else { call.reject("denied", "CAMERA_DENIED") }
            }
        default: call.reject("denied", "CAMERA_DENIED")
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

/// Takes or picks a photo, then reads its text with Vision.
final class LabelReader: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    var done: ((UIImage?) -> Void)?

    func present(from vc: UIViewController, camera: Bool) {
        let p = UIImagePickerController()
        p.sourceType = camera && UIImagePickerController.isSourceTypeAvailable(.camera) ? .camera : .photoLibrary
        p.delegate = self
        if p.sourceType == .camera { p.cameraOverlayView = LabelGuide(frame: vc.view.bounds) }
        vc.present(p, animated: true)
    }
    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        let img = info[.originalImage] as? UIImage
        picker.dismiss(animated: true) { self.done?(img) }
    }
    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true) { self.done?(nil) }
    }

    /// A small JPEG (data URL) so the form can show the photo next to what was read.
    static func thumbnail(_ image: UIImage) -> String {
        let maxSide: CGFloat = 1100
        let scale = min(1, maxSide / max(image.size.width, image.size.height))
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let small = UIGraphicsImageRenderer(size: size).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
        guard let data = small.jpegData(compressionQuality: 0.6) else { return "" }
        return "data:image/jpeg;base64," + data.base64EncodedString()
    }

    /// Text grouped into rows (same height on the page), each row left to right.
    static func read(_ image: UIImage, completion: @escaping ([String]) -> Void) {
        guard let cg = image.cgImage else { completion([]); return }
        let orientation = CGImagePropertyOrientation(rawValue: UInt32(image.imageOrientation.exifValue)) ?? .up
        let request = VNRecognizeTextRequest { req, _ in
            let obs = (req.results as? [VNRecognizedTextObservation]) ?? []
            let items: [(text: String, box: CGRect)] = obs.compactMap { o in
                guard let t = o.topCandidates(1).first?.string else { return nil }
                return (t, o.boundingBox)
            }.sorted { $0.box.midY > $1.box.midY }
            var rows: [[(text: String, box: CGRect)]] = []
            for it in items {
                if let last = rows.last, let ref = last.first,
                   abs(ref.box.midY - it.box.midY) < max(ref.box.height, it.box.height) * 0.6 {
                    rows[rows.count - 1].append(it)
                } else {
                    rows.append([it])
                }
            }
            let lines = rows.map { $0.sorted { $0.box.minX < $1.box.minX }.map { $0.text }.joined(separator: " | ") }
            DispatchQueue.main.async { completion(lines) }
        }
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        request.recognitionLanguages = ["en-US"]
        DispatchQueue.global(qos: .userInitiated).async {
            try? VNImageRequestHandler(cgImage: cg, orientation: orientation).perform([request])
        }
    }
}

/// Dashed box and hint over the camera: "Fit the nutrition table inside the box".
/// Doesn't take touches, so the normal camera buttons keep working.
final class LabelGuide: UIView {
    private let box = CAShapeLayer()
    private let hint = UILabel()
    override init(frame: CGRect) {
        super.init(frame: frame)
        isUserInteractionEnabled = false
        backgroundColor = .clear
        box.strokeColor = UIColor.white.cgColor
        box.fillColor = UIColor.clear.cgColor
        box.lineWidth = 2
        box.lineDashPattern = [8, 6]
        layer.addSublayer(box)
        hint.text = "Fit the nutrition table inside the box"
        hint.textColor = .white
        hint.font = .systemFont(ofSize: 16, weight: .semibold)
        hint.textAlignment = .center
        hint.layer.shadowColor = UIColor.black.cgColor
        hint.layer.shadowOpacity = 0.6
        hint.layer.shadowRadius = 3
        hint.layer.shadowOffset = .zero
        addSubview(hint)
    }
    required init?(coder: NSCoder) { fatalError() }
    override func layoutSubviews() {
        super.layoutSubviews()
        let w = bounds.width * 0.84, h = min(bounds.height * 0.46, w * 1.25)
        let r = CGRect(x: (bounds.width - w) / 2, y: bounds.height * 0.42 - h / 2, width: w, height: h)
        box.path = UIBezierPath(roundedRect: r, cornerRadius: 14).cgPath
        hint.frame = CGRect(x: 16, y: r.minY - 40, width: bounds.width - 32, height: 28)
    }
}

private extension UIImage.Orientation {
    var exifValue: Int {
        switch self {
        case .up: return 1
        case .down: return 3
        case .left: return 8
        case .right: return 6
        case .upMirrored: return 2
        case .downMirrored: return 4
        case .leftMirrored: return 5
        case .rightMirrored: return 7
        @unknown default: return 1
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
    private var device: AVCaptureDevice?
    private let torch = UIButton(configuration: .filled())

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input) else { finish(nil); return }
        self.device = device
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

        // Torch for dim kitchens (only on devices that have one).
        if device.hasTorch {
            var t = UIButton.Configuration.filled()
            t.image = UIImage(systemName: "flashlight.off.fill")
            t.baseBackgroundColor = UIColor(white: 0, alpha: 0.55)
            t.baseForegroundColor = .white
            t.cornerStyle = .capsule
            torch.configuration = t
            torch.accessibilityLabel = "Torch"
            torch.addTarget(self, action: #selector(toggleTorch), for: .touchUpInside)
            torch.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(torch)
            NSLayoutConstraint.activate([
                torch.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -20),
                torch.centerYAnchor.constraint(equalTo: cancel.centerYAnchor),
                torch.widthAnchor.constraint(equalToConstant: 48),
                torch.heightAnchor.constraint(equalToConstant: 48)
            ])
        }

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

    @objc private func toggleTorch() {
        guard let d = device, d.hasTorch, (try? d.lockForConfiguration()) != nil else { return }
        let on = d.torchMode != .on
        d.torchMode = on ? .on : .off
        d.unlockForConfiguration()
        torch.configuration?.image = UIImage(systemName: on ? "flashlight.on.fill" : "flashlight.off.fill")
        torch.accessibilityValue = on ? "On" : "Off"
    }

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
