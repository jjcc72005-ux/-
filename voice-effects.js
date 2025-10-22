// مكتبة معالجة الصوت
class VoiceEffects {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
    }
    
    async initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            return true;
        } catch (error) {
            console.error('خطأ في تهيئة AudioContext:', error);
            return false;
        }
    }
    
    async applyEffect(audioBuffer, effectType) {
        if (!this.audioContext) {
            await this.initialize();
        }
        
        switch (effectType) {
            case 'soft':
                return this.applySoftVoice(audioBuffer);
            case 'singer':
                return this.applySingerVoice(audioBuffer);
            case 'young':
                return this.applyYoungVoice(audioBuffer);
            case 'elegant':
                return this.applyElegantVoice(audioBuffer);
            default:
                return this.applySoftVoice(audioBuffer);
        }
    }
    
    async applySoftVoice(audioBuffer) {
        // تأثير صوت بنت ناعم
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        
        // تغيير النبرة (Pitch)
        const pitchShift = this.audioContext.createScriptProcessor(4096, 1, 1);
        pitchShift.onaudioprocess = function(event) {
            const input = event.inputBuffer.getChannelData(0);
            const output = event.outputBuffer.getChannelData(0);
            
            // محاكاة تغيير النبرة (هذا مثال مبسط)
            for (let i = 0; i < input.length; i++) {
                output[i] = input[i] * 1.3; // زيادة حدة الصوت
            }
        };
        
        // إضافة مرشح (Filter)
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 4000;
        
        // إضافة صدى خفيف
        const delay = this.audioContext.createDelay();
        delay.delayTime.value = 0.1;
        
        // توصيل العناصر
        source.connect(pitchShift);
        pitchShift.connect(filter);
        filter.connect(delay);
        delay.connect(this.audioContext.destination);
        
        // تشغيل الصوت
        source.start();
        
        // محاكاة المعالجة (في التطبيق الحقيقي سيتم معالجة الصوت فعلياً)
        return new Promise((resolve) => {
            setTimeout(() => {
                // في التطبيق الحقيقي، سيتم إنشاء AudioBuffer جديد
                // هنا نعيد نفس الملف لمحاكاة العمل
                resolve(audioBuffer);
            }, 1000);
        });
    }
    
    async applySingerVoice(audioBuffer) {
        // تأثير صوت مغنية
        // تطبيق تأثيرات موسيقية إضافية
        return this.applySoftVoice(audioBuffer);
    }
    
    async applyYoungVoice(audioBuffer) {
        // تأثير صوت شابة
        // صوت أعلى وأكثر حيوية
        return this.applySoftVoice(audioBuffer);
    }
    
    async applyElegantVoice(audioBuffer) {
        // تأثير صوت أنيق
        // صوت ناعم مع نبرة راقية
        return this.applySoftVoice(audioBuffer);
    }
    
    // تحويل AudioBuffer إلى Blob
    audioBufferToWav(audioBuffer) {
        const length = audioBuffer.length;
        const sampleRate = audioBuffer.sampleRate;
        const channels = audioBuffer.numberOfChannels;
        
        const interleaved = new Float32Array(length * channels);
        for (let channel = 0; channel < channels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                interleaved[i * channels + channel] = channelData[i];
            }
        }
        
        return this.encodeWAV(interleaved, sampleRate, channels);
    }
    
    encodeWAV(samples, sampleRate, numChannels) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);
        
        const writeString = function(view, offset, string) {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        const floatTo16BitPCM = function(output, offset, input) {
            for (let i = 0; i < input.length; i++, offset += 2) {
                const s = Math.max(-1, Math.min(1, input[i]));
                output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
        };
        
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * 2, true);
        view.setUint16(32, numChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, samples.length * 2, true);
        floatTo16BitPCM(view, 44, samples);
        
        return new Blob([view], { type: 'audio/wav' });
    }
}

// إنشاء نسخة عامة
const voiceEffects = new VoiceEffects();

// دالة تطبيق تأثير الصوت
async function applyVoiceEffect(audioFile, effectType) {
    try {
        // تحويل الملف إلى AudioBuffer
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // تطبيق التأثير
        const modifiedBuffer = await voiceEffects.applyEffect(audioBuffer, effectType);
        
        // تحويل AudioBuffer إلى Blob
        const wavBlob = voiceEffects.audioBufferToWav(modifiedBuffer);
        return wavBlob;
        
    } catch (error) {
        console.error('خطأ في معالجة الصوت:', error);
        throw error;
    }
}
