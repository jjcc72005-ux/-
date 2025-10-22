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
                autoGainControl: true
            } 
        });
        
        // إعداد المسجل
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
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
        audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        originalAudio.src = url;
        audioPreview.style.display = 'block';
        updateNavigation();
        closeRecordModal();
    }
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

// معالجة الصوت الحقيقية
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
        
        // معالجة الصوت الحقيقية
        const modifiedBlob = await applyVoiceEffect(audioFile, selectedVoice);
        
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

// دالة معالجة الصوت الحقيقية
async function applyVoiceEffect(audioFile, effectType) {
    try {
        // تحميل الملف الصوتي
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // إنشاء مصدر الصوت
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        
        // الحصول على إعدادات التأثير
        const settings = getEffectSettings(effectType);
        
        // تغيير سرعة التشغيل (يغير النبرة)
        source.playbackRate.value = settings.playbackRate;
        
        // إنشاء معالج الصوت
        const processor = audioContext.createScriptProcessor(2048, 1, 1);
        
        let lastSample = 0;
        processor.onaudioprocess = (event) => {
            const input = event.inputBuffer.getChannelData(0);
            const output = event.outputBuffer.getChannelData(0);
            
            for (let i = 0; i < input.length; i++) {
                // تأثير صوت بنت (رفع الترددات العالية)
                let sample = input[i] * settings.gain;
                
                // إضافة ترددات عالية (High Pass Filter بسيط)
                sample += (input[i] - lastSample) * settings.highPass;
                lastSample = input[i];
                
                // تقليل الترددات المنخفضة (Low Cut)
                sample = Math.tanh(sample * 1.5) * 0.8;
                
                output[i] = sample;
            }
        };
        
        // إعداد التسجيل
        const dest = audioContext.createMediaStreamDestination();
        const mediaRecorder = new MediaRecorder(dest.stream);
        
        return new Promise((resolve) => {
            const chunks = [];
            
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/wav' });
                resolve(blob);
            };
            
            // توصيل السلسلة الصوتية
            source.connect(processor);
            processor.connect(dest);
            
            // بدء التسجيل والمعالجة
            mediaRecorder.start();
            source.start();
            
            // إيقاف بعد انتهاء الصوت
            setTimeout(() => {
                mediaRecorder.stop();
                source.stop();
                audioContext.close();
            }, audioBuffer.duration * 1000 + 1000);
        });
        
    } catch (error) {
        console.error('خطأ في معالجة الصوت:', error);
        throw error;
    }
}

// إعدادات التأثيرات المختلفة
function getEffectSettings(effectType) {
    const settings = {
        soft: { playbackRate: 1.3, gain: 1.2, highPass: 0.3 },
        singer: { playbackRate: 1.4, gain: 1.3, highPass: 0.4 },
        young: { playbackRate: 1.5, gain: 1.4, highPass: 0.5 },
        elegant: { playbackRate: 1.25, gain: 1.1, highPass: 0.2 }
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
    // إنشاء صوت معاينة بسيط
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = voiceType === 'soft' ? 440 : 
                               voiceType === 'singer' ? 523.25 :
                               voiceType === 'young' ? 587.33 : 392;
    
    gainNode.gain.value = 0.1;
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);
    
    setTimeout(() => {
        oscillator.stop();
    }, 1000);
}

// تحميل الصوت
function downloadAudio() {
    if (modifiedAudio.src && modifiedAudio.src !== '') {
        const link = document.createElement('a');
        link.href = modifiedAudio.src;
        link.download = `صوت_معدل_${selectedVoice}.wav`;
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
