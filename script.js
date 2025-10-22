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

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
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
}

// إغلاق مودال التسجيل
function closeRecordModal() {
    recordModal.style.display = 'none';
    if (isRecording) {
        stopRecording();
    }
}

// بدء التسجيل
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    }
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

// معالجة الصوت
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
        setTimeout(() => {
            processing.style.display = 'none';
            result.style.display = 'block';
            
            const url = URL.createObjectURL(modifiedBlob);
            modifiedAudio.src = url;
        }, 3000);
        
    } catch (error) {
        alert('حدث خطأ أثناء معالجة الصوت: ' + error.message);
        processing.style.display = 'none';
    }
}

// محاكاة شريط التقدم
function simulateProgress() {
    const progress = document.querySelector('.progress');
    let width = 0;
    
    const interval = setInterval(() => {
        if (width >= 100) {
            clearInterval(interval);
        } else {
            width += Math.random() * 10;
            progress.style.width = Math.min(width, 100) + '%';
        }
    }, 200);
}

// معاينة الأصوات
function playDemo(voiceType) {
    // في التطبيق الحقيقي، سيتم تشغيل عينات صوتية
    alert(`تشغيل معاينة صوت ${voiceType}`);
}

// تحميل الصوت
function downloadAudio() {
    if (modifiedAudio.src) {
        const link = document.createElement('a');
        link.href = modifiedAudio.src;
        link.download = `صوت_معدل_${selectedVoice}.wav`;
        link.click();
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
