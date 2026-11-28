import UIKit
import Capacitor

/// Registers Menufi's in-app native plugins with the Capacitor bridge.
/// Main.storyboard points its root view controller at this class.
class MenufiViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(HealthPlugin())
        bridge?.registerPluginInstance(MenufiPlugin())
    }

    #if DEBUG
    // App Store screenshots only: `xcrun simctl launch booted <bundle id> -seedDemo`
    // skips setup and fills the app with sample data. Debug builds only; never in TestFlight or the App Store.
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        let args = ProcessInfo.processInfo.arguments
        guard args.contains("-seedDemo") else { return }
        // Optional `-tab food` (home, cycle, food, fitness) opens that tab after the data is in.
        var tab = "home"
        if let i = args.firstIndex(of: "-tab"), i + 1 < args.count, ["home", "cycle", "food", "fitness"].contains(args[i + 1]) { tab = args[i + 1] }
        DispatchQueue.main.asyncAfter(deadline: .now() + 6) { [weak self] in
            self?.webView?.evaluateJavaScript("try{var o=document.querySelector('.ob');if(o)o.remove();document.documentElement.classList.remove('eb-locked');var s=document.querySelector('.launch-splash');if(s)s.remove();window.EBApp&&EBApp.seedDummy();setTimeout(function(){var t=document.querySelector('.eb-toast,.toast');if(t)t.remove();EBApp.go('\(tab)');window.scrollTo(0,0);},300);}catch(e){}", completionHandler: nil)
        }
    }
    #endif
}
