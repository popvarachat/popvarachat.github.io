# Chair Import Cost Intelligence · Independent GitHub Edition

ระบบนี้เป็น production clone ชุดใหม่ที่แยกขาดจาก Chair Import Cost Apps Script Production เดิม

## Separation boundary

- GitHub URL: `https://popvarachat.github.io/chair-import-cost/`
- Frontend entry: GitHub Pages
- Application runtime: Apps Script project ใหม่
- Deployment: คนละ Deployment ID กับระบบเดิม
- Engine DB: ไฟล์ใหม่
- Identity Vault: ไฟล์ใหม่
- Cost Vault: ไฟล์ใหม่
- Access Control / Access Requests / Change Log: คนละชุด
- ไม่มีการอ่านหรือเขียนกลับไปยัง DB ของระบบเดิม

ข้อมูลเริ่มต้นถูก copy เป็น baseline ณ วันที่สร้างระบบ จากนั้นสองระบบสามารถ Update / Implement / ทดลอง / Release แยกกันได้

## Runtime architecture

GitHub Pages → Independent Apps Script Runtime → RBAC / Calculation / Audit → Independent Engine DB + Independent Identity Vault + Independent Cost Vault

## Security

GitHub source ไม่เก็บ Raw Cost หรือข้อมูลฐานข้อมูลจริงไว้ใน repository
ข้อมูลจริงยังถูกบังคับสิทธิ์ที่ Backend ด้วย PRESENTATION / EXECUTIVE / COSTING / ADMIN และแยกข้อมูลต้นทุนออกจาก Product Identity

## Production label

`Chair Import Cost Intelligence GH V1 - Independent Production`

Legacy Apps Script Production เดิมยังคงอยู่และไม่ได้ถูกลบหรือแก้ไขโดยการสร้างระบบนี้
