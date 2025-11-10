# คู่มือการติดตั้งและใช้งาน YouTube Study App

## 🚀 Quick Start (แนะนำ)

### 1. เตรียม API Keys (ไม่บังคับแต่แนะนำ)

#### YouTube Data API Key
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้าง Project ใหม่หรือเลือก Project ที่มีอยู่
3. เปิดใช้งาน YouTube Data API v3
4. สร้าง API Key ใน Credentials
5. คัดลอก API Key

#### OpenAI API Key
1. ไปที่ [OpenAI Platform](https://platform.openai.com/)
2. สร้างบัญชีและเติมเครดิต
3. ไปที่ [API Keys](https://platform.openai.com/api-keys)
4. สร้าง API Key ใหม่
5. คัดลอก API Key

#### Gemini API Key (ทางเลือกแทน OpenAI)
1. ไปที่ [Google AI Studio](https://makersuite.google.com/app/apikey)
2. สร้าง API Key
3. คัดลอก API Key

### 2. ติดตั้งและรัน

```bash
# 1. Clone repository
git clone <repository-url>
cd youtube-study-app

# 2. สร้างไฟล์ .env
cp .env.example .env

# 3. แก้ไขไฟล์ .env ใส่ API Keys
nano .env  # หรือใช้ text editor อื่น

# 4. รัน Docker
docker-compose up --build

# 5. เปิดเบราว์เซอร์
# ไปที่ http://localhost:3000
```

### 3. ทดสอบการใช้งาน

1. **เพิ่มวิดีโอแรก**
   - คลิก "Add Video"
   - วาง URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
   - คลิก "Add Video"

2. **รอการประมวลผล**
   - แอปจะดึงข้อมูลวิดีโอ
   - ถอดเสียงอัตโนมัติ
   - สร้างสรุปด้วย AI (ถ้ามี API Key)

3. **ดูรายละเอียด**
   - คลิกที่วิดีโอเพื่อดูรายละเอียด
   - ดูสรุปและ transcript

## 📋 การตั้งค่าแบบละเอียด

### ตัวเลือก LLM Provider

แก้ไขไฟล์ `.env`:

#### ใช้ OpenAI (แนะนำ)
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

#### ใช้ Gemini
```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=...
```

#### ใช้ Local LLM (Ollama)
```env
LLM_PROVIDER=local
LOCAL_LLM_URL=http://localhost:11434
LOCAL_LLM_MODEL=llama2
```

สำหรับ Local LLM ต้องติดตั้ง [Ollama](https://ollama.ai/) ก่อน:
```bash
# ติดตั้ง Ollama
curl https://ollama.ai/install.sh | sh

# ดาวน์โหลด model
ollama pull llama2

# รัน Ollama server
ollama serve
```

### การใช้งานโดยไม่มี API Keys

แอปสามารถทำงานได้โดยไม่ต้องใช้ API Keys แต่จะมีข้อจำกัด:

**ไม่มี YouTube API Key:**
- ✅ ยังดึงข้อมูลพื้นฐานได้ (ชื่อ, ผู้สร้าง, ระยะเวลา)
- ❌ ข้อมูลบางอย่างอาจไม่ครบถ้วน
- ❌ ไม่สามารถนำเข้า playlist ได้

**ไม่มี LLM API Key:**
- ✅ ยังดึงข้อมูลและถอดเสียงได้
- ❌ ไม่สามารถสร้างสรุปได้
- ❌ ไม่สามารถใช้ Chat ได้

## 🔧 การพัฒนา (Development Mode)

### รัน Backend แยก

```bash
cd backend
npm install

# สร้าง database
npx prisma generate
npx prisma db push

# รัน server
npm run dev
```

Backend จะรันที่ `http://localhost:8000`

### รัน Frontend แยก

```bash
cd frontend
npm install
npm run dev
```

Frontend จะรันที่ `http://localhost:3001`

### ดู Database

```bash
cd backend
npx prisma studio
```

Prisma Studio จะเปิดที่ `http://localhost:5555`

## 🐳 Docker Commands

### รัน Container
```bash
docker-compose up
```

### รันแบบ Background
```bash
docker-compose up -d
```

### ดู Logs
```bash
docker-compose logs -f
```

### หยุด Container
```bash
docker-compose down
```

### ลบ Data และเริ่มใหม่
```bash
docker-compose down -v
docker-compose up --build
```

### เข้าไปใน Container
```bash
docker-compose exec app sh
```

## 📊 Database Management

### Backup Database
```bash
docker-compose exec app cp /app/data/app.db /app/data/backup.db
```

### Restore Database
```bash
docker-compose exec app cp /app/data/backup.db /app/data/app.db
```

### Reset Database
```bash
docker-compose down -v
docker-compose up --build
```

## 🔍 การแก้ไขปัญหา

### ปัญหา: Container ไม่เริ่มต้น

**วิธีแก้:**
```bash
# ตรวจสอบ logs
docker-compose logs

# ลบและสร้างใหม่
docker-compose down
docker-compose up --build
```

### ปัญหา: Port 3000 ถูกใช้งานอยู่

**วิธีแก้:**
แก้ไข `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # เปลี่ยนเป็น port อื่น
```

### ปัญหา: ถอดเสียงไม่ได้

**สาเหตุ:**
- วิดีโอไม่มี captions
- วิดีโอเป็น private หรือถูกลบ

**วิธีแก้:**
- เลือกวิดีโอที่มี captions
- ตรวจสอบว่าวิดีโอยังมีอยู่

### ปัญหา: สรุปไม่ถูกสร้าง

**สาเหตุ:**
- ไม่มี LLM API Key
- API Key หมดอายุหรือไม่ถูกต้อง
- เครดิต API หมด

**วิธีแก้:**
- ตรวจสอบ API Key ใน `.env`
- ตรวจสอบเครดิต API
- ดู logs: `docker-compose logs -f`

### ปัญหา: Database Error

**วิธีแก้:**
```bash
# Reset database
docker-compose down -v
docker-compose up --build

# หรือเข้าไปแก้ใน container
docker-compose exec app sh
cd backend
npx prisma db push
```

## 📈 Performance Tips

### เพิ่มความเร็ว

1. **ใช้ YouTube API Key** - ดึงข้อมูลเร็วขึ้น
2. **Cache Transcripts** - ไม่ต้องดึงซ้ำ
3. **Limit Videos** - อย่าเพิ่มวิดีโอมากเกินไปพร้อมกัน

### ลด Memory Usage

แก้ไข `docker-compose.yml`:
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 1G
```

## 🔐 Security Best Practices

1. **อย่า commit .env** - มี API Keys
2. **ใช้ strong passwords** - ถ้ามีระบบ auth
3. **Update dependencies** - `npm update`
4. **Backup database** - สม่ำเสมอ

## 📞 ขอความช่วยเหลือ

หากพบปัญหา:
1. ตรวจสอบ logs: `docker-compose logs -f`
2. ดู README.md
3. เปิด Issue บน GitHub
4. ตรวจสอบ API Keys

---

**Happy Learning! 📚✨**

