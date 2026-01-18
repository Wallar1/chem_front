if (navigator.xr) {
    navigator.xr.isSessionSupported("immersive-ar").then((isSupported) => {
      if (isSupported) {
        immersiveButton.addEventListener("click", onButtonClicked);
        immersiveButton.textContent = "Enter XR";
        immersiveButton.disabled = false;
      } else {
        console.error("WebXR doesn't support immersive-ar mode!");
      }
    });
  } else {
    console.error("WebXR is not available!");
  }
  
  function onButtonClicked() {
    if (!xrSession) {
      navigator.xr.requestSession("immersive-ar").then((session) => {
        xrSession = session;
        // onSessionStarted() not shown for reasons of brevity and clarity.
        onSessionStarted(xrSession);
      });
    } else {
      // Button is a toggle button.
      xrSession.end().then(() => (xrSession = null));
    }
  }
  









let inputSourceList = NULL;
let leftHandSource = NULL;
let rightHandSource = NULL;

xrSession.addEventListener("inputsourceschange", (event) => {
  inputSourceList = event.session.inputSources;

  inputSourceList.forEach((source) => {
    switch (source) {
      case "left":
        leftHandSource = source;
        break;
      case "right":
        rightHandSource = source;
        break;
    }
  });
});

// The controllers for the XR devices are separate from the controllers that are returned by navigator.getGamepads()
// Gamepad.mapping returns "xr-standard"
// https://immersive-web.github.io/webxr-gamepads-module/#xr-standard-heading

// the order is selectstart on press down, then select and selectend on release
xrSession.addEventListener("select", (event) => {
    let inputSource = event.inputSource;
    let frame = event.frame;
  
    /* handle the event */
  });

// there is also squeezestart, squeeze, and squeezeend for grabbing objects and moving them
  xrSession.addEventListener("squeezestart", (event) => {
    const targetRaySpace = event.inputSource.targetRaySpace;
    const hand = event.inputSource.handedness;
  
    let targetRayPose = event.frame.getPose(targetRaySpace, viewerRefSpace);
    if (!targetRayPose) {
      return;
    }
  
    let targetRayTransform = targetRayPose.transform;
    let targetObject = findTargetObject(targetRayTransform);
  
    if (targetObject) {
      if (avatar.heldObject[hand]) {
        dropObject(hand);
      }
      pickUpObject(targetObject, hand);
    }
  });
  xrSession.addEventListener("squeeze", (event) => {
    const targetRaySpace = event.inputSource.targetRaySpace;
    const hand = event.inputSource.handedness;
  
    let targetRayPose = event.frame.getPose(targetRaySpace, viewerRefSpace);
    if (!targetRayPose) {
      return;
    }
  
    let targetRayTransform = targetRayPose.transform;
    let targetPosition = findTargetPosition(targetRayTransform);
  
    if (targetPosition) {
      if (avatar.heldObject[hand]) {
        putObject(hand, targetPosition);
        avatar.heldObject[hand] = null;
      }
    }
  });
  







  