# KAIROS - Control de Nómina, Quincenas y Alquiler de Equipos

Aplicación web diseñada específicamente para la gestión de turnos, jornadas ordinarias (Lunes a Viernes), sábados, domingos, festivos y horas extras, con desglose legal automático entre **Salario Mínimo Legal Vigente (SMLV)** y **Pagos No Salariales por Alquiler de Herramientas y Equipos de Trabajo**.

---

## 🧮 Reglas de Cálculo Implementadas

1. **Compensación Quincenal Pactada:**
   * $\text{Base Quincenal} = \frac{\text{Salario Mensual}}{2}$
2. **Valor del Día Ordinario:**
   * $\text{Valor Día} = \frac{\text{Base Quincenal}}{10 \text{ días hábiles L-V}}$
3. **Valor Hora Ordinaria (8 horas):**
   * $\text{Valor Hora} = \frac{\text{Valor Día}}{8}$
4. **Sábados Laborados:**
   * Se pagan a **valor de día ordinario** (100%), ya que la jornada semanal regular es de Lunes a Viernes.
5. **Domingos Laborados:**
   * Recargo acordado del **+50%** (factor 1.5x).
6. **Festivos Laborados:**
   * Recargo acordado del **+50%** (factor 1.5x).
7. **Noche Ordinaria:**
   * Recargo por trabajo nocturno ordinario del **+35%** sobre el valor de la hora ordinaria.
8. **Horas Extras (Lunes a Viernes):**
   * **Diurna:** +25% de recargo.
   * **Nocturna:** +75% de recargo.

---

## 📄 Desglose de la Colilla de Pago (PDF)

* **1. Devengos Salariales:**
  * Salario Básico Fijo correspondiente a la mitad del Salario Mínimo Legal Vigente (SMLV quincenal) proporcional a los días laborados.
* **2. Pagos No Salariales:**
  * Alquiler de Herramientas y Equipos (Diferencia entre el básico pactado y el SMLV).
  * Sábados laborados.
  * Domingos (+50%).
  * Festivos (+50%).
  * Noche ordinaria (+35%).
  * Horas extras diurnas y nocturnas.
* **Totales y Firmas:**
  * Total Salarial + Total No Salarial = **Neto a Transferir**.
  * Firma del Operario y Firma de Aprobación de la Empresa.

---

## 🔑 Credenciales de Acceso

* **Panel del Jefe / Administrador:**
  * PIN por defecto: `1234` (se puede cambiar dentro de la pestaña *Tarifas y Parámetros*).
  * Permisos: Crear/editar operarios, modificar salarios pactados ("si gana más o gana menos"), corregir quincenas enviadas y configurar tarifas.
* **Operarios Precargados de Ejemplo:**
  1. **Carlos Andrés Rodríguez** (C.C. 1020304050) &bull; PIN: `1020` &bull; Salario mensual: `$2.570.000`
  2. **Juan David Morales** (C.C. 1035678901) &bull; PIN: `1035` &bull; Salario mensual: `$1.800.000`
  3. **Wilson Gómez Restrepo** (C.C. 71234567) &bull; PIN: `7123` &bull; Salario mensual: `$2.800.000`

---

## 🚀 Cómo Iniciar la Aplicación

Simplemente haz doble clic sobre el archivo:
`INICIAR_APP.bat`

O por terminal:
```bash
npm run dev
```
Y abre tu navegador en `http://localhost:5173`.
