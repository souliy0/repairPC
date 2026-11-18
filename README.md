# RepairCom — ລະບົບບັນທຶກການສ້ອມແປງຄອມພິວເຕີ

ລະບົບຈັດການທະບຽນອຸປະກອນຄອມພິວເຕີ, ສະເປັກເຄື່ອງ, ແຜນຜັງທີ່ຕັ້ງອຸປະກອນ (`Map 701 B`), ປະຫວັດການແຈ້ງສ້ອມ, ສະຕອກອະໄຫຼ່, ແຜນບຳລຸງຮັກສາເຊີງປ້ອງກັນ (PM), ອອກລາຍງານ 1-Click, ນຳເຂົ້າ/ສົ່ງອອກ Excel (`.xlsx` / `.xls` 97-2003) ແລະ ຮອງຮັບການ Run ເທິງ Google Apps Script + Google Sheets.

## ການເປີດສະແດງຜົນເທິງ GitHub Pages

Repository ນີ້ຕັ້ງຄ່າ GitHub Actions (`/.github/workflows/deploy.yml`) ແລະ Relative Asset Base (`base: './'`) ໄວ້ຮຽບຮ້ອຍແລ້ວ:

1. ເຂົ້າໄປທີ່ **Settings** ຂອງ Repository ໃນ GitHub.
2. ເລືອກເມນູ **Pages** ດ້ານຊ້າຍ.
3. ໃນຫົວຂໍ້ **Build and deployment -> Source**, ໃຫ້ປ່ຽນຈາກ `Deploy from a branch` ເປັນ **`GitHub Actions`**.
4. ເມື່ອ Push ໂຄ້ດຂຶ້ນ `main` (ຫຼື ກົດ **Actions -> Deploy RepairCom to GitHub Pages -> Run workflow**), GitHub ຈະ Build ແລະ ເປີດເວັບໃຫ້ໃຊ້ງານໄດ້ທັນທີ.

## ການ Run ເທິງເຄື່ອງ (Local Development)

```bash
npm install
npm run dev
```

ສຳລັບ Build ໄຟລ໌ Production:

```bash
npm run build
```

## ການນຳໄປໃຊ້ໃນ Google Apps Script + Google Sheets

1. ສ້າງໄຟລ໌ `apps-script/Index.html` ດ້ວຍຄຳສັ່ງ:
   ```bash
   npm run build:gas
   ```
2. ເປີດ Google Sheets -> **Extensions -> Apps Script**.
3. ວາງໂຄ້ດຈາກ `apps-script/Code.gs` ແລະ `apps-script/Index.html`.
4. ກົດ **Deploy -> New deployment -> Web app**.
