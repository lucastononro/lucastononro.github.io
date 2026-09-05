# White Rabbit release evidence

- `blog-launch.png`: actual browser screenshot of the local production post, with its game launch before the article.
- `phone-controls.png`: actual browser screenshot of the game rendered in an 844 × 390 iframe. The surrounding preview controls make the viewport explicit. Movement and look gestures were performed through browser input.
- `phone-ending.png`: the final chapter completed in that phone layout, using a development checkpoint. The three minutes shown are time spent testing that checkpoint, not a claim about the full adventure's duration.
- `fidelity-and-touch-tests.txt`: 22 passing game tests, captured by the pr-review-evidence log wrapper.
- `site-production-build.txt`: successful build of the blog and game together.
- `site-publishing-tests.txt`: three passing publishing tests.

The screenshots come from the in-app browser and are not a desktop video recording. No physical handset was used. The source and game assets are original to this project; the source walkthrough is linked in the audit and not bundled.

A transient MutationObserver error appeared during development iframe reload/input checks. Subsequent reloads and drags did not repeat it, and an in-page error listener reported no game error. The application source does not create a MutationObserver, but the original report has not been attributed conclusively. The production launch reported no errors.
