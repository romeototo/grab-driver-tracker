# ROMEO Grab Driver Tracker

เว็บแอปสำหรับดูรายได้ รายจ่าย เป้าหมาย และประสิทธิภาพการขับ Grab จากข้อมูลตั้งต้นใน Google Sheet

## ใช้งานบนเครื่อง

```bash
npm install
npm run dev
```

เปิดที่ `http://127.0.0.1:5173/grab-driver-tracker/`

## URL ที่ deploy แล้ว

`https://romeototo.github.io/grab-driver-tracker/`

## สถานะปัจจุบัน

- เป็น frontend static app
- ใช้ข้อมูลตั้งต้นจาก Google Sheet
- ฟอร์มเพิ่มบันทึกอัปเดตข้อมูลในหน้าเว็บทันที
- มีช่องอัปโหลดรูปหลักฐาน
- ถ้ายังไม่ตั้งค่า URL ซิงก์ ระบบจะแนบรูปในหน้าเว็บเฉพาะ session นั้น
- มี Google Apps Script ตัวอย่างใน `apps-script/Code.gs` สำหรับอัปโหลดรูปเข้า Google Drive และเขียนข้อมูลกลับ Google Sheet

## เปิดใช้การอัปโหลดรูปเข้า Drive/Sheet

1. ไปที่ [Google Apps Script](https://script.google.com/)
2. สร้าง project ใหม่
3. วางโค้ดจาก `apps-script/Code.gs`
4. กด Deploy > New deployment
5. เลือก type เป็น Web app
6. ตั้ง Execute as เป็น Me
7. ตั้ง Who has access เป็น Anyone
8. Deploy แล้ว copy Web app URL
9. เปิดเว็บ tracker บนมือถือ แล้ววาง URL ในช่อง `URL ซิงก์ Drive/Sheet`

หลังตั้งค่าแล้ว เมื่อเพิ่มบันทึกพร้อมรูป:

- รูปจะถูกเก็บใน Google Drive folder `Grab Driver Tracker Proofs`
- แถวใหม่จะถูกเพิ่มในแท็บ `📋 บันทึกรายวัน`
- ค่าน้ำมันจะถูกเพิ่มในแท็บ `💸 รายจ่าย`
- ตารางและ dashboard ในหน้าเว็บจะอัปเดตทันทีหลังบันทึกสำเร็จ

## Deploy GitHub Pages

```bash
npm run build
```

จากนั้น publish โฟลเดอร์ `dist` ไปที่ branch `gh-pages`
