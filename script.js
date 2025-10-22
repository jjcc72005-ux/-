// حالة التطبيق
let currentStep = 1;
let audioFile = null;
let audioBlob = null;
let selectedVoice = 'soft';
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingTimer = null;
let recordingTime = 0;
let audioContext = null;
let analyser = null;
let canvasContext = null;
let animationId = null;

// عناصر DOM
const steps = document.querySelectorAll('.step');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const processBtn = document.getElementById('processBtn');
const uploadOption = document.getElementById('uploadOption');
const recordOption = document.getElementById('recordOption');
const audioFileInput = document.getElementById('audioFile');
const audioPreview = document.getElementById('audioPreview');
const originalAudio = document.getElementById('originalAudio');
const recordModal = document.getElementById('recordModal');
const startRecordBtn = document.getElementById('startRecord');
const stopRecordBtn = document.getElementById('stopRecord');
const playRecordBtn = document.getElementById('playRecord');
const useRecordingBtn = document.getElementById('useRecording');
const timer = document.querySelector('.timer');
const processing = document.getElementById('processing');
const result = document.getElementById('result');
const modifiedAudio = document.getElementById('modifiedAudio');
const waveformCanvas = document.getElementById('waveformCanvas');

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeAudioContext();
});

function initializeEventListeners() {
    // رفع الملف
    uploadOption.addEventListener('click', () => audioFileInput.click());
    audioFileInput.addEventListener('change', handleFileUpload);
    
    // تسجيل الصوت
    recordOption.addEventListener('click', openRecordModal);
    
    // اختيار الصوت
    document.querySelectorAll('.voice-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.voice-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            selectedVoice = this.dataset.effect;
        });
    });
    
    // التحكم في التسجيل
    startRecordBtn.addEventListener('click', startRecording);
    stopRecordBtn.addEventListener('click', stopRecording);
    playRecordBtn.addEventListener('click', playRecording);
    useRecordingBtn.addEventListener('click', useRecording);
    
    // إغلاق المودال
    document.querySelector('.close').addEventListener('click', closeRecordModal);
    window.addEventListener('click', function(event) {
        if (event.target === recordModal) {
            closeRecordModal();
        }
    });
}

// تهيئة AudioContext
function initializeAudioContext() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        
        canvasContext = waveformCanvas.getContext('2d');
    } catch (error) {
        console.error('خطأ في تهيئة AudioContext:', error);
    }
}

// التعامل مع رفع الملف
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('audio/')) {
            alert('يرجى رفع ملف صوتي فقط');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            alert('حجم الملف يجب أن يكون أقل من 10MB');
            return;
        }
        
        audioFile = file;
        const url = URL.createObjectURL(file);
        originalAudio.src = url;
        audioPreview.style.display = 'block';
        updateNavigation();
    }
}

// فتح مودال التسجيل
function openRecordModal() {
    recordModal.style.display = 'block';
    resetRecording();
    drawWaveform(); // رسم الموجة الافتراضية
}

// إغلاق مودال التسجيل
function closeRecordModal() {
    recordModal.style.display = 'none';
    if (isRecording) {
        stopRecording();
    }
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
}

// بدء التسجيل
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 44100,
                channelCount: 1
            } 
        });
        
        // إعداد المسجل
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            useRecordingBtn.disabled = false;
            playRecordBtn.disabled = false;
        };
        
        // إعداد التحليل البصري
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        // بدء الرسم البصري
        drawWaveform();
        
        // بدء التسجيل
        mediaRecorder.start();
        isRecording = true;
        startRecordBtn.disabled = true;
        stopRecordBtn.disabled = false;
        
        // بدء المؤقت
        startTimer();
        
    } catch (error) {
        alert('خطأ في الوصول إلى الميكروفون: ' + error.message);
    }
}

// إيقاف التسجيل
function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        startRecordBtn.disabled = false;
        stopRecordBtn.disabled = true;
        stopTimer();
        
        // إيقاف جميع المسارات الصوتية
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        // إيقاف الرسم البصري
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    }
}

// رسم الموجة الصوتية
function drawWaveform() {
    if (!analyser || !canvasContext) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
        animationId = requestAnimationFrame(draw);
        
        if (!isRecording) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        canvasContext.fillStyle = 'rgb(18, 18, 18)';
        canvasContext.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);
        
        const barWidth = (waveformCanvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;
            
            const gradient = canvasContext.createLinearGradient(0, 0, 0, waveformCanvas.height);
            gradient.addColorStop(0, '#8a2be2');
            gradient.addColorStop(1, '#ff69b4');
            
            canvasContext.fillStyle = gradient;
            canvasContext.fillRect(x, waveformCanvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }
    
    draw();
}

// تشغيل التسجيل
function playRecording() {
    if (audioBlob) {
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        audio.play();
    }
}

// استخدام التسجيل
function useRecording() {
    if (audioBlob) {
        // تحويل webm إلى wav
        convertWebmToWav(audioBlob).then(wavBlob => {
            audioFile = new File([wavBlob], 'recording.wav', { type: 'audio/wav' });
            const url = URL.createObjectURL(wavBlob);
            originalAudio.src = url;
            audioPreview.style.display = 'block';
            updateNavigation();
            closeRecordModal();
        });
    }
}

// تحويل webm إلى wav
async function convertWebmToWav(webmBlob) {
    const audioContext = new AudioContext();
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    return audioBufferToWav(audioBuffer);
}

// تحويل AudioBuffer إلى WAV Blob
function audioBufferToWav(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const buffer = new ArrayBuffer(44 + audioBuffer.length * blockAlign);
    const view = new DataView(buffer);
    
    // كتابة header WAV
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
    view.setUint32(4, 36 + audioBuffer.length * blockAlign, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, audioBuffer.length * blockAlign, true);
    
    // كتابة بيانات الصوت
    const channelData = audioBuffer.getChannelData(0);
    floatTo16BitPCM(view, 44, channelData);
    
    return new Blob([view], { type: 'audio/wav' });
}

// إزالة الصوت
function removeAudio() {
    audioFile = null;
    audioBlob = null;
    audioFileInput.value = '';
    audioPreview.style.display = 'none';
    updateNavigation();
}

// المؤقت
function startTimer() {
    recordingTime = 0;
    updateTimer();
    recordingTimer = setInterval(() => {
        recordingTime++;
        updateTimer();
    }, 1000);
}

function stopTimer() {
    clearInterval(recordingTimer);
}

function updateTimer() {
    const minutes = Math.floor(recordingTime / 60);
    const seconds = recordingTime % 60;
    timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function resetRecording() {
    audioChunks = [];
    audioBlob = null;
    useRecordingBtn.disabled = true;
    playRecordBtn.disabled = true;
    startRecordBtn.disabled = false;
    stopRecordBtn.disabled = true;
    timer.textContent = '00:00';
}

// التنقل بين الخطوات
function nextStep() {
    if (currentStep < 3) {
        steps[currentStep - 1].classList.remove('active');
        currentStep++;
        steps[currentStep - 1].classList.add('active');
        updateNavigation();
    }
}

function previousStep() {
    if (currentStep > 1) {
        steps[currentStep - 1].classList.remove('active');
        currentStep--;
        steps[currentStep - 1].classList.add('active');
        updateNavigation();
    }
}

function updateNavigation() {
    prevBtn.disabled = currentStep === 1;
    
    if (currentStep === 1) {
        nextBtn.style.display = audioFile ? 'block' : 'none';
        processBtn.style.display = 'none';
        nextBtn.disabled = !audioFile;
    } else if (currentStep === 2) {
        nextBtn.style.display = 'none';
        processBtn.style.display = 'block';
    } else if (currentStep === 3) {
        nextBtn.style.display = 'none';
        processBtn.style.display = 'none';
    }
}

// معالجة الصوت الحقيقية مع Pitch Shifting
async function processAudio() {
    if (!audioFile) {
        alert('يرجى رفع ملف صوتي أولاً');
        return;
    }
    
    processing.style.display = 'block';
    document.getElementById('step3').classList.add('active');
    
    try {
        // محاكاة التقدم
        simulateProgress();
        
        // معالجة الصوت الحقيقية مع تغيير النبرة
        const modifiedBlob = await applyAdvancedVoiceEffect(audioFile, selectedVoice);
        
        // عرض النتيجة
        const url = URL.createObjectURL(modifiedBlob);
        modifiedAudio.src = url;
        
        processing.style.display = 'none';
        result.style.display = 'block';
        
    } catch (error) {
        console.error('خطأ في معالجة الصوت:', error);
        alert('حدث خطأ في معالجة الصوت: ' + error.message);
        processing.style.display = 'none';
    }
}

// دالة معالجة الصوت المتقدمة مع Pitch Shifting
async function applyAdvancedVoiceEffect(audioFile, effectType) {
    return new Promise(async (resolve, reject) => {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await audioFile.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // إعدادات التأثير حسب نوع الصوت
            const settings = getAdvancedEffectSettings(effectType);
            
            // إنشاء مصدر الصوت
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            
            // تطبيق Pitch Shifting باستخدام طريقة PSOLA المبسطة
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            
            let pitchRatio = settings.pitchRatio;
            let newSampleRate = audioBuffer.sampleRate * pitchRatio;
            
            processor.onaudioprocess = function(event) {
                const inputBuffer = event.inputBuffer;
                const outputBuffer = event.outputBuffer;
                const inputData = inputBuffer.getChannelData(0);
                const outputData = outputBuffer.getChannelData(0);
                
                // تطبيق Pitch Shifting مبسط
                for (let i = 0; i < outputBuffer.length; i++) {
                    const oldIndex = i / pitchRatio;
                    const index1 = Math.floor(oldIndex);
                    const index2 = Math.min(index1 + 1, inputData.length - 1);
                    const fraction = oldIndex - index1;
                    
                    // الاستيفاء الخطي
                    outputData[i] = inputData[index1] * (1 - fraction) + inputData[index2] * fraction;
                }
                
                // تطبيق تأثيرات التردد
                applyFrequencyEffects(outputData, settings);
            };
            
            // إعداد التسجيل
            const dest = audioContext.createMediaStreamDestination();
            const mediaRecorder = new MediaRecorder(dest.stream);
            const chunks = [];
            
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/wav' });
                resolve(blob);
                audioContext.close();
            };
            
            // توصيل المعالجات
            source.connect(processor);
            processor.connect(dest);
            
            // بدء التسجيل والمعالجة
            mediaRecorder.start();
            source.start();
            
            // إيقاف بعد انتهاء الصوت
            setTimeout(() => {
                mediaRecorder.stop();
                source.stop();
            }, (audioBuffer.duration * 1000) / pitchRatio + 1000);
            
        } catch (error) {
            reject(error);
        }
    });
}

// تطبيق تأثيرات التردد المتقدمة
function applyFrequencyEffects(audioData, settings) {
    const length = audioData.length;
    
    // High-pass filter لإزالة الترددات المنخفضة (لجعل الصوت أنثوي)
    let prevSample = 0;
    for (let i = 0; i < length; i++) {
        const highPass = audioData[i] - prevSample;
        audioData[i] = highPass * settings.highPassGain;
        prevSample = audioData[i];
    }
    
    // Boost للترددات المتوسطة والعالية
    for (let i = 0; i < length; i++) {
        // تضخيم الترددات العالية
        audioData[i] = Math.tanh(audioData[i] * settings.distortion) * settings.outputGain;
        
        // تقليل الترددات المنخفضة جداً
        if (Math.abs(audioData[i]) < 0.01) {
            audioData[i] *= 0.5;
        }
    }
    
    // تطبيق تأثير الاهتزاز الأنثوي
    for (let i = 1; i < length - 1; i++) {
        const vibrato = Math.sin(i * 0.01) * settings.vibrato;
        audioData[i] = audioData[i] * (1 + vibrato) + audioData[i-1] * vibrato;
    }
}

// إعدادات التأثيرات المتقدمة
function getAdvancedEffectSettings(effectType) {
    const settings = {
        soft: { 
            pitchRatio: 1.8,        // رفع النبرة بشكل كبير
            highPassGain: 1.8,      // تضخيم الترددات العالية
            distortion: 1.3,        // تشويه بسيط للصوت
            outputGain: 0.8,        // تخفيف الصوت النهائي
            vibrato: 0.02           // اهتزاز خفيف
        },
        singer: { 
            pitchRatio: 1.9,
            highPassGain: 2.0,
            distortion: 1.4,
            outputGain: 0.9,
            vibrato: 0.03
        },
        young: { 
            pitchRatio: 2.0,        // أعلى نبرة للصوت الشاب
            highPassGain: 2.2,
            distortion: 1.5,
            outputGain: 1.0,
            vibrato: 0.04
        },
        elegant: { 
            pitchRatio: 1.7,        // نبرة متوسطة راقية
            highPassGain: 1.6,
            distortion: 1.2,
            outputGain: 0.7,
            vibrato: 0.01
        }
    };
    return settings[effectType] || settings.soft;
}

// محاكاة شريط التقدم
function simulateProgress() {
    const progress = document.querySelector('.progress');
    let width = 0;
    
    const interval = setInterval(() => {
        if (width >= 100) {
            clearInterval(interval);
        } else {
            width += Math.random() * 15;
            progress.style.width = Math.min(width, 100) + '%';
        }
    }, 200);
}

// معاينة الأصوات
function playDemo(voiceType) {
    const settings = getAdvancedEffectSettings(voiceType);
    
    // إنشاء صوت معاينة أكثر تعقيداً
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(filter);
    filter.connect(audioContext.destination);
    
    oscillator1.type = 'sine';
    oscillator2.type = 'triangle';
    oscillator1.frequency.value = 440 * settings.pitchRatio;
    oscillator2.frequency.value = 660 * settings.pitchRatio;
    
    filter.type = 'highpass';
    filter.frequency.value = 800;
    
    gainNode.gain.value = 0.1;
    
    oscillator1.start();
    oscillator2.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);
    
    setTimeout(() => {
        oscillator1.stop();
        oscillator2.stop();
    }, 1500);
}

// تحميل الصوت
function downloadAudio() {
    if (modifiedAudio.src && modifiedAudio.src !== '') {
        const link = document.createElement('a');
        link.href = modifiedAudio.src;
        link.download = `صوت_بنت_${selectedVoice}.wav`;
        link.click();
    } else {
        alert('لا يوجد صوت لتحميله');
    }
}

// معالجة أخرى
function processAgain() {
    result.style.display = 'none';
    currentStep = 2;
    steps[2].classList.remove('active');
    steps[1].classList.add('active');
    updateNavigation();
}

// التمرير إلى القسم
function scrollToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({ 
        behavior: 'smooth' 
    });
}
