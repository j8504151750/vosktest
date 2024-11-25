(function (window) {
    //兼容
    window.URL = window.URL || window.webkitURL;
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.mediaDevices.getUserMedia;


    var HZRecorder = function (stream, config) {
        config = config || {};
        config.sampleBits = 16;      //採樣數位 8, 16
        config.sampleRate = 16000;   //採樣率(1/6 44100)


        var context = new AudioContext();
        var audioInput = context.createMediaStreamSource(stream);
        var recorder = context.createScriptProcessor(4096, 1, 1);


        var audioData = {
            size: 0          //錄音文件長度
            , buffer: []     //錄音緩存
            , inputSampleRate: context.sampleRate    //輸入採樣率
            , inputSampleBits: 16       //輸入採樣數位 8, 16
            , outputSampleRate: config.sampleRate    //輸出採樣率
            , outputSampleBits: config.sampleBits       //輸出採樣數位 8, 16
            , input: function (data) {
                this.buffer.push(new Float32Array(data));
                this.size += data.length;
            }
            , compress: function () { //合併壓縮
                //合併
                var data = new Float32Array(this.size);
                var offset = 0;
                for (var i = 0; i < this.buffer.length; i++) {
                    data.set(this.buffer[i], offset);
                    offset += this.buffer[i].length;
                }
                //壓縮
                var compression = parseInt(this.inputSampleRate / this.outputSampleRate);
                var length = data.length / compression;
                var result = new Float32Array(length);
                var index = 0, j = 0;
                while (index < length) {
                    result[index] = data[j];
                    j += compression;
                    index++;
                }
                return result;
            }
            , encodeWAV: function () {
                var sampleRate = Math.min(this.inputSampleRate, this.outputSampleRate);
                var sampleBits = Math.min(this.inputSampleBits, this.outputSampleBits);
                var bytes = this.compress();
                var dataLength = bytes.length * (sampleBits / 8);
                var buffer = new ArrayBuffer(44 + dataLength);
                var data = new DataView(buffer);


                var channelCount = 1;//單聲道
                var offset = 0;


                var writeString = function (str) {
                    for (var i = 0; i < str.length; i++) {
                        data.setUint8(offset + i, str.charCodeAt(i));
                    }
                }

                // 資源交換文件標識符
                writeString('RIFF'); offset += 4;
                // 下個地址開始到文件尾總字節數,即文件大小-8
                data.setUint32(offset, 36 + dataLength, true); offset += 4;
                // WAV文件標誌
                writeString('WAVE'); offset += 4;
                // 波形格式標誌
                writeString('fmt '); offset += 4;
                // 過濾字節,一般為 0x10 = 16
                data.setUint32(offset, 16, true); offset += 4;
                // 格式類別 (PCM形式採樣數據)
                data.setUint16(offset, 1, true); offset += 2;
                // 通道數
                data.setUint16(offset, channelCount, true); offset += 2;
                // 採樣率,每秒樣本數,表示每個通道的播放速度
                data.setUint32(offset, sampleRate, true); offset += 4;
                // 波形數據傳輸率 (每秒平均字節數) 單聲道×每秒數據位數×每樣本數據位/8
                data.setUint32(offset, channelCount * sampleRate * (sampleBits / 8), true); offset += 4;
                // 快數據調整數 採樣一次占用字節數 單聲道×每樣本的數據位數/8
                data.setUint16(offset, channelCount * (sampleBits / 8), true); offset += 2;
                // 每樣本數據位數
                data.setUint16(offset, sampleBits, true); offset += 2;
                // 數據標識符
                writeString('data'); offset += 4;
                // 採樣數據總數,即數據總大小-44
                data.setUint32(offset, dataLength, true); offset += 4;
                // 寫入採樣數據
                if (sampleBits === 8) {
                    for (var i = 0; i < bytes.length; i++, offset++) {
                        var s = Math.max(-1, Math.min(1, bytes[i]));
                        var val = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        val = parseInt(255 / (65535 / (val + 32768)));
                        data.setInt8(offset, val, true);
                    }
                } else {
                    for (var i = 0; i < bytes.length; i++, offset += 2) {
                        var s = Math.max(-1, Math.min(1, bytes[i]));
                        data.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                    }
                }


                return new Blob([data], { type: 'audio/wav' });
            }
        };


        //開始錄音
        this.start = function () {
            audioInput.connect(recorder);
            recorder.connect(context.destination);
        }


        //停止
        this.stop = function () {
            recorder.disconnect();
        }


        //獲取音頻文件
        this.getBlob = function () {
            this.stop();
            return audioData.encodeWAV();
        }


        //回放
        this.play = function (audio) {
            audio.src = window.URL.createObjectURL(this.getBlob());
        }


        //上傳
        this.upload = function (url, callback) {
            var fd = new FormData();
            fd.append("file", this.getBlob());
            var xhr = new XMLHttpRequest();
            if (callback) {
                xhr.upload.addEventListener("progress", function (e) {
                    callback('uploading', e);
                }, false);
                xhr.addEventListener("load", function (e) {
                    callback('ok', e);
                }, false);
                xhr.addEventListener("error", function (e) {
                    callback('error', e);
                }, false);
                xhr.addEventListener("abort", function (e) {
                    callback('cancel', e);
                }, false);
            }
            xhr.open("POST", url);
            xhr.send(fd);
            xhr.onreadystatechange = function () {
                console.log("語音識別結果："+xhr.responseText)
                $("#text").html('<h2>' + xhr.responseText + '</h2>'); // 使用 .html() 而不是 .append()，只保留一行結果
            }
        }

        //音頻採集
        recorder.onaudioprocess = function (e) {
            audioData.input(e.inputBuffer.getChannelData(0));
            //record(e.inputBuffer.getChannelData(0));
        }


    };
    //拋出異常
    HZRecorder.throwError = function (message) {
        alert(message);
        throw new function () { this.toString = function () { return message; } }
    }
    //是否支持錄音
    HZRecorder.canRecording = (navigator.getUserMedia != null);
    //獲取錄音機
    HZRecorder.get = function (callback, config) {
        if (callback) {
            if (navigator.getUserMedia) {
                navigator.getUserMedia(
                    { audio: true } //只啟用音頻
                    , function (stream) {
                        var rec = new HZRecorder(stream, config);
                        callback(rec);
                    }
                    , function (error) {
                        switch (error.code || error.name) {
                            case 'PERMISSION_DENIED':
                            case 'PermissionDeniedError':
                                HZRecorder.throwError('使用者拒絕提供資訊。');
                                break;
                            case 'NOT_SUPPORTED_ERROR':
                            case 'NotSupportedError':
                                HZRecorder.throwError('瀏覽器不支持硬體設備。');
                                break;
                            case 'MANDATORY_UNSATISFIED_ERROR':
                            case 'MandatoryUnsatisfiedError':
                                HZRecorder.throwError('無法發現指定的硬體設備。');
                                break;
                            default:
                                HZRecorder.throwError('無法打開麥克風。異常資訊:' + (error.code || error.name));
                                break;
                        }
                    });
            } else {
                HZRecorder.throwError('當前瀏覽器不支持錄音功能。'); return;
            }
        }
    }


    window.HZRecorder = HZRecorder;


})(window);
