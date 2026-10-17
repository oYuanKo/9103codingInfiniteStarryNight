
class ZoomCameraV2 {
    constructor() {
        this.zoom = 1;
        this.targetZoom = 1;

        this.x = 0;
        this.y = 0;

        this.targetX = 0;
        this.targetY = 0;

        // Current-world zoom limits
        this.minZoom = 1;
        this.maxZoom = 3;

        this.sensitivity = 0.0015;
        this.smoothTime = 110;
    }

    // Convert screen position to painting coordinates
    screenToWorld(sx, sy) {
        return {
            x: (sx - this.x) / this.zoom,
            y: (sy - this.y) / this.zoom
        };
    }

    // Set target zoom around the mouse position
    zoomAt(delta, sx, sy) {
        const oldZoom = this.targetZoom;

        const nextZoom = constrain(
            oldZoom * Math.exp(-delta * this.sensitivity),
            this.minZoom,
            this.maxZoom
        );

        if (Math.abs(nextZoom - oldZoom) < 0.000001) {
            return;
        }

        // World point underneath the cursor
        const worldX = (sx - this.targetX) / oldZoom;
        const worldY = (sy - this.targetY) / oldZoom;

        this.targetZoom = nextZoom;

        // Preserve that point at the cursor
        this.targetX = sx - worldX * nextZoom;
        this.targetY = sy - worldY * nextZoom;

        // Do not expose empty canvas edges
        this.targetX = constrain(
            this.targetX,
            width * (1 - nextZoom),
            0
        );

        this.targetY = constrain(
            this.targetY,
            height * (1 - nextZoom),
            0
        );
    }

    // Frame-rate-independent smoothing
    update(dt) {
        const safeDt = Math.min(dt || 16.67, 50);

        const t = 1 - Math.exp(
            -safeDt / this.smoothTime
        );

        this.zoom = lerp(
            this.zoom,
            this.targetZoom,
            t
        );

        this.x = lerp(this.x, this.targetX, t);
        this.y = lerp(this.y, this.targetY, t);
    }

    // Draw the painting through the camera
    draw(texture) {
        push();

        translate(this.x, this.y);
        scale(this.zoom);

        image(texture, 0, 0, width, height);

        pop();
    }

    reset() {
        this.zoom = 1;
        this.targetZoom = 1;

        this.x = 0;
        this.y = 0;

        this.targetX = 0;
        this.targetY = 0;
    }
}
