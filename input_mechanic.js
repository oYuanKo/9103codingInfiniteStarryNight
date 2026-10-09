
class InputMechanic {
    constructor() {
        this.zoomLevel = 1;
        this.targetZoom = 1;

        this.minZoom = 0.25;
        this.maxZoom = 1;

        this.zoomSensitivity = 0.001;
        this.smoothing = 0.12;

        this.hoveredStar = null;
        this.selectedStar = null;
        this.enterRequest = null;
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

        this.hoveredStar = null;
        this.selectedStar = null;
        this.enterRequest = null;
    }


    handlePointer(x, y, stars) {
        this.hoveredStar = null;

        if (x < 0 || x > width || y < 0 || y > height) {
            return;
        }

        let closestDistance = Infinity;

        for (const star of stars) {
            // Only major stars are selectable
            if (!star.isMajor) continue;

            const d = dist(x, y, star.x, star.y);
            const hitRadius = max(18, star.radius * 3);

            if (d < hitRadius && d < closestDistance) {
                this.hoveredStar = star;
                closestDistance = d;
            }
        }
    }

    requestEnter() {
        if (!this.hoveredStar) return;

        this.selectedStar = this.hoveredStar;
        this.enterRequest = this.selectedStar;
    }

    consumeEnterRequest() {
        const request = this.enterRequest;
        this.enterRequest = null;
        return request;
    }

}
