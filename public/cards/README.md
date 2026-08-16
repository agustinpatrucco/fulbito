# Fondos de las cartas

Poné acá tus tres imágenes, con estos nombres exactos:

- `gold.png`
- `silver.png`
- `bronze.png`

Formato: **3:4 vertical**, idealmente 600×800 px. PNG o JPG (si usás JPG, cambiá las
rutas en `src/config/cardLayout.ts`).

Mientras no existan, la app dibuja un degradado de reemplazo por cada categoría, así que
todo funciona igual — no hace falta tocar código para que aparezcan.

Cuando las agregues, el nombre y las posiciones probablemente no queden alineados con tu
diseño. Se ajusta en **`src/config/cardLayout.ts`**: todas las coordenadas están en
porcentajes de la carta, y cambiar esos números es lo único que hace falta.
