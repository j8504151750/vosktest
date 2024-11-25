class RecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = [];
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            this.buffer.push(input[0]);
        }
        return true; // 表示處理器保持運行
    }
}

registerProcessor('recorder-processor', RecorderProcessor);
