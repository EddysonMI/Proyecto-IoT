#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// 🔑 WiFi (en Wokwi usa Wokwi-GUEST sin contraseña)
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// 🌍 URL de tu backend Node.js (ajusta si ngrok cambia)
const char* serverURL = "https://87fad7200e95.ngrok-free.app";

// Pines de sensores
const int PIN_PIR     = 27;
const int PIN_VIB     = 26;
const int PIN_BUZZER  = 25;
const int PIN_LED     = 2;
const int PIN_BOTON   = 14;

// Variables del sistema
bool sistemaArmado    = true;
bool alarmaActiva     = false;
unsigned long hastaAlarma = 0;

const unsigned long TIEMPO_ALARMA_MS = 10000; // 10 segundos

// --- Función para enviar evento al backend ---
void enviarEvento(String tipo, String detalle, String clasificacion = "sensor") {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setInsecure();  // ⚠️ Solo para pruebas: ignora certificados SSL

    HTTPClient http;
    http.begin(client, String(serverURL) + "/api/events"); // ✅ Asegura ruta correcta
    http.addHeader("Content-Type", "application/json");

    String json = "{\"type\":\"" + tipo +
                  "\", \"detail\":\"" + detalle +
                  "\", \"classification\":\"" + clasificacion + "\"}";

    Serial.println("📤 Enviando: " + json);

    int httpResponseCode = http.POST(json);

    if (httpResponseCode > 0) {
      Serial.println("✅ Evento enviado. Código: " + String(httpResponseCode));
    } else {
      Serial.println("❌ Error enviando evento, Código: " + String(httpResponseCode));
      Serial.println(http.errorToString(httpResponseCode));
    }

    http.end();
  } else {
    Serial.println("📡 WiFi no conectado");
  }
}

// --- SETUP ---
void setup() {
  pinMode(PIN_PIR, INPUT);
  pinMode(PIN_VIB, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BOTON, INPUT_PULLUP);

  Serial.begin(115200);
  Serial.println("🔌 Sistema de seguridad ESP32 (Wokwi)");

  // Conectar a WiFi
  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ Conectado a WiFi!");
  digitalWrite(PIN_LED, sistemaArmado ? HIGH : LOW);
}

// --- LOOP ---
void loop() {
  unsigned long ahora = millis();

  // --- Botón armar/desarmar ---
  if (digitalRead(PIN_BOTON) == LOW) {
    delay(200);
    while (digitalRead(PIN_BOTON) == LOW) {}
    sistemaArmado = !sistemaArmado;
    alarmaActiva = false;
    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(PIN_LED, sistemaArmado ? HIGH : LOW);

    if (sistemaArmado) {
      Serial.println("🔒 Sistema ARMADO");
      enviarEvento("ARMED", "El sistema ha sido armado", "system");
    } else {
      Serial.println("🔓 Sistema DESARMADO");
      enviarEvento("DISARMED", "El sistema ha sido desarmado", "system");
    }
  }

  // --- Lectura sensores ---
  bool pir = digitalRead(PIN_PIR);
  bool vib = (digitalRead(PIN_VIB) == LOW);

  if (sistemaArmado && (pir || vib)) {
    alarmaActiva = true;
    hastaAlarma = ahora + TIEMPO_ALARMA_MS;
    Serial.println("⚠️ ALERTA: Movimiento o Vibración detectada!");
    enviarEvento("ALERT", "Movimiento o vibración detectada", "sensor");
  }

  // --- Alarma ---
  if (alarmaActiva) {
    bool fase = ((ahora / 300) % 2) == 0;
    digitalWrite(PIN_BUZZER, fase ? HIGH : LOW);
    digitalWrite(PIN_LED, fase ? HIGH : LOW);

    if (ahora > hastaAlarma) {
      alarmaActiva = false;
      digitalWrite(PIN_BUZZER, LOW);
      digitalWrite(PIN_LED, sistemaArmado ? HIGH : LOW);
      Serial.println("🔕 Alarma finalizada.");
      enviarEvento("ALARM_OFF", "La alarma ha finalizado", "system");
    }
  }

  delay(10);
}
