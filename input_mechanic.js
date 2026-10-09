
class InputMechanic {
    constructor() {
        this.zoomLevel = 1;
        this.targetZoom = 1;

        this.minZoom = 0.25;
        this.maxZoom = 1;

        this.zoomSensitivity = 0.001;
        this.smoothing = 0.12;
    }

    // Mouse wheel controls the target zoom
    handleWheel(delta) {
        this.targetZoom -= delta * this.zoomSensitivity;

        this.targetZoom = constrain(
            this.targetZoom,
            this.minZoom,
            this.maxZoom
        );
    }

    // Smoothly approach the target zoom
    update() {
        this.zoomLevel = lerp(
            this.zoomLevel,
            this.targetZoom,
            this.smoothing
        );
    }

    reset() {
        this.zoomLevel = 1;
        this.targetZoom = 1;
    }
}
