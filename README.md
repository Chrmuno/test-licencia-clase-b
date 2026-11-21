# Test Licencia Clase B

App web (PWA) para practicar el examen teórico de licencia de conducir clase B en Chile.

- 35 preguntas al azar por intento, 3 de doble puntaje (38 puntos en total), igual que el examen municipal de CONASET.
- Para aprobar en la app se exige el 100% (38/38). Si no, se muestran los errores con su explicación y hay que repetir el test.
- Los intentos se guardan en el navegador del celular.

## Archivos

- `index.html`: la app.
- `data.js`: banco de preguntas que usa la app.
- `banco/`: el mismo banco en JSON y Excel, para revisarlo o editarlo.

Fuente de las preguntas: Cuestionario Examen Teórico Licencias Clase B, Municipalidad de Puente Alto. La pregunta sobre velocidad máxima urbana está corregida a 50 km/h (Ley CONVIVE, 2018).

Sitio estático: no necesita build. En Vercel se despliega tal cual.
