---
watermark: ORIRO
disable-model-invocation: true
name: eng-robotics
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Robotics engineering — kinematics, dynamics, ROS, path planning, sensors,
  actuators, control, and robot design. Activate for robot design, ROS programming,
  kinematics calculations, path planning, or any robotics question.
  Sources: MIT 6.832 OCW, ROS documentation (Apache 2.0).
---

# Robotics Engineering

## Robot kinematics

### Degrees of freedom (DOF)

DOF = number of independent parameters describing configuration.
6-DOF robot arm: Can position end-effector at any position and orientation in 3D space.
Grübler's formula (planar): M = 3(n-1) - 2j₁ - j₂

### Forward kinematics (FK)

Given joint angles → find end-effector position and orientation.
Denavit-Hartenberg (DH) parameters: Systematic representation of joint-link relationships.
Transform chain: T_0_to_n = T₀₁ × T₁₂ × ... × T(n-1)n

### Inverse kinematics (IK)

Given desired end-effector pose → find joint angles.
Analytical: Closed-form solution. Fast. Limited to specific geometries.
Numerical (Jacobian): Iterative. General. Can get stuck in singularities.
**Singularity:** Configuration where Jacobian rank drops. Robot loses DOF momentarily.

## Robot dynamics

τ = M(q)q'' + C(q,q')q' + G(q)
τ = joint torques, M = mass matrix, C = Coriolis/centripetal, G = gravity.

## Trajectory planning

**Trapezoidal velocity profile:** Accelerate → constant velocity → decelerate.
**S-curve profile:** Smooth transitions. Reduces vibration. Used in CNC and robotics.

## Sensors

**Encoders:** Position feedback. Incremental or absolute.
**Force/torque sensors:** 6-axis at wrist. Enable force control.
**IMU:** Accelerometers + gyroscopes. Orientation and acceleration.
**LIDAR:** 3D point cloud. Obstacle detection, mapping.

## ROS (Robot Operating System)

De facto standard middleware for robotics.
Publisher/Subscriber pattern via topics.
Services: Request-response communication.
Actions: Long-running tasks with feedback.

```python
import rclpy
from rclpy.node import Node
from std_msgs.msg import String

class MinimalPublisher(Node):
    def __init__(self):
        super().__init__('minimal_publisher')
        self.publisher_ = self.create_publisher(String, 'topic', 10)
        self.timer = self.create_timer(0.5, self.timer_callback)

    def timer_callback(self):
        msg = String()
        msg.data = 'Hello ORIRO'
        self.publisher_.publish(msg)
```

## Control architectures

**PID control:** Position + velocity loop cascaded.
**Computed torque control:** Cancel nonlinear dynamics, apply linear PD.
**Impedance control:** Control mechanical impedance. Good for contact tasks.
**ISO TS 15066:** Collaborative robot safety — force and power limiting.

## Path planning

**A\*:** Heuristic search. Optimal if heuristic admissible.
**RRT:** Probabilistic. Handles high-DOF spaces. Fast.
**SLAM:** Simultaneous Localization and Mapping. Build map and localize.

Sources: MIT OCW 6.832 Underactuated Robotics (CC-BY-NC-SA),
ROS 2 documentation (Apache 2.0), Bruno Siciliano "Robotics" (principles)
