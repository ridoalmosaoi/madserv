# MadServ Fullstack – Docker

مشروع لوحة MadServ مع **Node.js + Express + SQLite** داخل Docker.

## المتطلبات
- Docker و Docker Compose مثبتين على الخادم أو جهازك.

## الملفات
- `Dockerfile` — يبني صورة Node 18-alpine.
- `docker-compose.yml` — يُشغّل الخدمة ويكشف المنفذ 3000.
- مجلد `public/` — الواجهة الأمامية.
- `server.js` — الخادم وواجهات REST API.
- `madserv.db` — ستنشأ تلقائيًا (تُخزّن داخل مجلد دائم في Volume).

> كلمة مرور الدخول الافتراضية في الواجهة: **##77** (تجريبية).

## التشغيل السريع
```bash
# 1) انسخ كل ملفات المشروع (هذا المجلد) إلى خادمك
# 2) من داخل نفس المجلد:
docker compose up -d --build
# 3) افتح المتصفح:
#    http://YOUR_SERVER_IP:3000
#    ثم انتقل إلى /login.html لتسجيل الدخول
```

## تحديث الكود
```bash
# بعد أي تعديل:
docker compose up -d --build
```

## المجلدات الدائمة
- حجم (Volume) باسم `madserv_data` يُخزّن قاعدة البيانات SQLite داخل `/app/data` في الحاوية.

> ملاحظة: الخادم يسمح بالوصول إلى الواجهة الأمامية من مجلد `public/` مباشرة.
> لو أردت HTTPS ونطاق (Domain)، يُنصح بربط **Nginx** أمامه مع شهادات Let's Encrypt.
