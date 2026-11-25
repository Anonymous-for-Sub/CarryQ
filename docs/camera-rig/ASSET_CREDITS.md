# Observation camera assets

- Intel RealSense D435 mesh, RealSense ROS description. Apache-2.0.
  https://github.com/realsenseai/realsense-ros/tree/ros2-master/realsense2_description
- Franka/Panda camera mount from NVIDIA IndustRealKit, designed by Kenneth
  MacLean. NVIDIA License, included in licenses/.
  https://github.com/NVlabs/industrealkit/tree/main/camera_mount
- Camera Tripod v1 by tevy. CC0 1.0 Universal.
  https://tevy.dev/models/camera-tripod
  https://creativecommons.org/publicdomain/zero/1.0/

Camera and mount geometry is converted, welded and simplified for browser
rendering with a relative geometric error target of 0.003. Materials are retained
as solid colors. The tripod uses the published geometry and base material color.
Sensor positions are nominal illustration transforms. The external tripods are
scaled uniformly to a 1.10 m height above their feet.

Mounting references include Franka's camera-mount guide and the IndustReal
Panda hand-camera setup. Camera hardware is visual instrumentation for the
existing scripted insertion illustration.
