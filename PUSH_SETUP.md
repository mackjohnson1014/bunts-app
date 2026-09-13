# Getting push notifications onto the iPhone

Expo Go cannot receive remote push notifications — the capability was removed.
A development build from EAS Build is required, and on iOS that means Apple
Push Notification service, which is gated behind a paid membership.

The app itself runs fine in Expo Go today. Only push needs this.

## Cost and time

| | |
|---|---|
| Apple Developer Program | **$99/year**, no free tier for APNs |
| Expo account | Free |
| Enrollment wait | Usually hours, sometimes 24–48h (Apple verifies identity) |
| Build time after that | ~15–20 min for the first iOS build |

## Order of operations

Steps marked **you** need your credentials or your money. I cannot and will not
do those — sign-ins and payments stay with you.

1. **you** — Enroll at [developer.apple.com/programs](https://developer.apple.com/programs/).
   Individual membership is fine for a personal app. Wait for the approval email.

2. **you** — Create a free account at [expo.dev](https://expo.dev).

3. **you** — `cd mobile && npx eas-cli login`

4. **me or you** — `npx eas-cli init`
   Writes `extra.eas.projectId` into `app.json`. The Alerts screen reads it;
   without it, `getExpoPushTokenAsync` cannot issue a token.

5. **you** — `npx eas-cli device:create`
   Registers your iPhone's UDID. Follow the link on the phone and install the
   profile. A device not registered before the build cannot install it.

6. **you** — `npx eas-cli build --profile development --platform ios`
   EAS asks for your Apple ID, then offers to create the APNs key and
   provisioning profile for you. Say yes to all of it — hand-managing
   certificates is a bad time.

7. **you** — Install the build from the link EAS prints, then run
   `npx expo start --dev-client` and open the app from your home screen (not
   Expo Go).

8. **you → me** — Open the Alerts tab, tap Enable notifications, accept the
   permission prompt. The Expo push token appears on screen. Paste it to me.

9. **me** — `./push-test.sh 'ExponentPushToken[...]'`
   Sends a real scratch alert straight through Expo's service, no backend
   needed. If it lands on your lock screen, the notification path is proven.

10. **then** — Deploy the Worker and the app registers its token automatically,
    so alerts start coming from the lineup poller instead of by hand.

## If the test push does not arrive

- Check the token starts with `ExponentPushToken[` — a `dev-` prefix means the
  dev client issued a local token and the EAS project is not linked.
- `push-test.sh` prints Expo's response. A `DeviceNotRegistered` ticket means
  the build's credentials do not match the registered device.
- Notification permission can be granted and then muted by a Focus mode.
  Check Settings → Notifications → Bunts.

## What the $99 also buys

TestFlight distribution, and the ability to install the app on your phone
without a 7-day expiry. With a free Apple account, dev builds expire weekly and
need reinstalling — worth knowing if you ever reconsider.
