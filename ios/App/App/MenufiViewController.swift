import UIKit
import Capacitor

/// Registers Menu-fi's in-app native plugins with the Capacitor bridge.
/// Main.storyboard points its root view controller at this class.
class MenufiViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(HealthPlugin())
    }
}
