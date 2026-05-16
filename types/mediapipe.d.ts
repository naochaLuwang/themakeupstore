import type { FaceLandmarker } from "@mediapipe/tasks-vision"

declare global {
    interface Window {
        __faceLandmarker?: FaceLandmarker
    }
}
