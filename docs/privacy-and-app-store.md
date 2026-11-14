# Privacy updates for barcode scanning, label reading and shared packs

## 1. Add to your privacy policy

**Camera and photos.** Menu-fi uses your camera to scan barcodes on food packs and to photograph nutrition labels. You can also choose a photo you already took. Label photos are read on your phone and are not uploaded or kept.

**Looking up packaged food.** When a pack isn't already on your phone, Menu-fi sends its barcode, or the product's name, to Open Food Facts (openfoodfacts.org) and UPCitemdb (upcitemdb.com) to find its nutrition. Nothing about you is sent with it.

**Shared pack database.** When you're signed in and save a pack's nutrition from its label, the barcode, product name and nutrition values are added to Menu-fi's shared pack database, so other people who scan that pack get the numbers. If you report a shared pack's numbers as wrong, that report is counted. Your account is linked to what you added or reported, privately, only so each person counts once. Other users can't see who added or reported anything. These links are deleted when you delete your account. Product information you added may stay in the shared database.

**Food data credits.** Packaged-food data comes partly from Open Food Facts, available under the Open Database License (ODbL).

## 2. App Store Connect → App Privacy

Privacy Policy URL (done): https://ashimaranisingh-web.github.io/Eatbetter/privacy.html

App Privacy → **Get Started** → "Do you or your third-party partners collect data from this app?" → **Yes**, then tick:

| Data type | Why it's collected | Purpose | Linked to the user? | Used for tracking? |
|---|---|---|---|---|
| Contact Info → **Email Address** | Account sign-in | App Functionality | Yes | No |
| Contact Info → **Name** | Profile name, in the account backup | App Functionality | Yes | No |
| Health & Fitness → **Health** | Cycle dates, symptoms, weight, in the backup | App Functionality | Yes | No |
| Health & Fitness → **Fitness** | Workouts and energy, in the backup | App Functionality | Yes | No |
| User Content → **Photos or Videos** | Profile photo, in the backup (label photos are never sent) | App Functionality | Yes | No |
| User Content → **Other User Content** | Meal logs (backup) and packs shared from labels | App Functionality | Yes | No |
| Identifiers → **User ID** | Account ID | App Functionality | Yes | No |
| Usage Data → **Product Interaction** | Opt-in anonymous usage stats (PostHog) | Analytics | **No** | No |

Leave everything else unticked. Not collected: label photos and Apple Health reads (stay on the phone), barcode and name lookups (sent to Open Food Facts / UPCitemdb without anything identifying you, and not stored by Menu-fi), and meal-assistant text (sent with your own key, straight to Anthropic).

Then **Publish**.

## 3. Already done in the app
- Camera permission text: "Menu-fi uses the camera to scan the barcode on a food pack, so you can log it without typing."
- Photos permission text: "Menu-fi reads a photo of a food pack's nutrition label, so you don't have to type the numbers."
- Profile → **Food data and privacy** explains the sources, camera use, shared packs and lookups, and credits Open Food Facts.
