# Lock Base Image - Expected Behavior

## Admin Area
- Admin dapat toggle "Lock Base Image" ON/OFF
- Ketika ON: `baseImageLocked = true` disimpan ke database
- Ketika OFF: `baseImageLocked = false` disimpan ke database

## Frontend (Direct Customize / Customer)

### Ketika Lock Base Image = TRUE (ON di admin)
- ✅ Base Image (mockup): TIDAK bisa digerakkan oleh customer
- ✅ Elements (text, image, dll): BISA digerakkan oleh customer
- ✅ Safe Area: TIDAK bisa digerakkan oleh customer (selalu locked)

### Ketika Lock Base Image = FALSE (OFF di admin)
- ✅ Base Image (mockup): BISA digerakkan oleh customer
- ✅ Elements (text, image, dll): BISA digerakkan oleh customer
- ✅ Safe Area: TIDAK bisa digerakkan oleh customer (selalu locked)

## Current Issue
User melaporkan behavior "terbalik" - perlu klarifikasi:
1. Apakah base image yang terbalik?
2. Apakah element yang terbalik?
3. Atau keduanya?

## Testing Steps
1. Admin: Set Lock Base Image = ON, Save
2. Frontend: Buka direct customize
3. Test: Coba gerakkan base image → Seharusnya TIDAK BISA
4. Test: Coba gerakkan element (text) → Seharusnya BISA

5. Admin: Set Lock Base Image = OFF, Save
6. Frontend: Refresh, buka direct customize
7. Test: Coba gerakkan base image → Seharusnya BISA
8. Test: Coba gerakkan element (text) → Seharusnya BISA
