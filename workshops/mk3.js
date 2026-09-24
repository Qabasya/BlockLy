window.MKB = window.MKB || {};
window.MKB.workshops = window.MKB.workshops || [];
window.MKB.workshops.push({
  id: "mk3",
  title: "МК-3: Адресная лента WS2812",
  language: "arduino",
  stages: [
    {
      id: "white",
      title: "Простая заливка ленты цветом",
      fragments: [
        {
          free: false,
          code:
`#define LED_PIN 5
#define NUM_LEDS 30
#define POT A0
#include <FastLED.h>`
        },
        { free: false, code: "CRGB leds[NUM_LEDS];" },
        {
          free: false,
          code:
`void setup() {
  FastLED.addLeds<WS2812, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(200);
}`
        },
        {
          free: false,
          code:
`void loop() {
  fill_solid(leds, NUM_LEDS, CRGB::{{White|Red|Blue|DeepPink|Green|Indigo|Teal|Yellow}});
  FastLED.show();
}`
        }
      ],
      steps: [
        { line: "#define LED_PIN 5", text: "Задайте пин, к которому подключена лента." },
        { line: "#define NUM_LEDS 30", text: "Укажите, сколько светодиодов на ленте." },
        { line: "#define POT A0", text: "Задайте пин потенциометра." },
        { line: "#include <FastLED.h>", text: "Подключите библиотеку FastLED." },
        { line: "CRGB leds[NUM_LEDS];", text: "Создайте массив цветов — по одному на каждый светодиод." },
        { line: "void setup() {", text: "Начните функцию setup: она выполняется один раз при включении." },
        { line: "FastLED.addLeds<WS2812, LED_PIN, GRB>(leds, NUM_LEDS);", text: "Сообщите библиотеке тип ленты, пин и массив светодиодов." },
        { line: "FastLED.setBrightness(200);", text: "Задайте яркость ленты." },
        { line: "void loop() {", text: "Начните функцию loop: она повторяется бесконечно." },
        { line: "fill_solid(leds, NUM_LEDS, CRGB::{{White|Red|Blue|DeepPink|Green|Indigo|Teal|Yellow}});", text: "Вызовите функцию для заливки ленты одним цветом" },
        { line: "FastLED.show();", text: "Покажите цвета на ленте." }
      ]
    },
    {
      id: "stage2",
      title: "Эффект «Искры»",
      fragments: [
        {
          free: false,
          code:
`#define LED_PIN 5
#define NUM_LEDS 30
#define POT A0
#include <FastLED.h>`
        },
        { free: false, code: "CRGB leds[NUM_LEDS];" },
        {
          free: false,
          code:
`void setup() {
  FastLED.addLeds<WS2812, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(200);
}`
        },
        {
          free: false,
          code:
`void loop() {
  fadeToBlackBy(leds, NUM_LEDS, {{25}});
  int pos = random16(NUM_LEDS);
  leds[pos] += CRGB::{{White|Red|Blue|DeepPink|Green|Indigo|Teal|Yellow}};
  FastLED.show();
  delay(30);
}`
        }
      ],
      steps: [
        { line: "#define LED_PIN 5", text: "Задайте пин, к которому подключена лента." },
        { line: "#define NUM_LEDS 30", text: "Укажите, сколько светодиодов на ленте." },
        { line: "#define POT A0", text: "Задайте пин потенциометра." },
        { line: "#include <FastLED.h>", text: "Подключите библиотеку FastLED." },
        { line: "CRGB leds[NUM_LEDS];", text: "Создайте массив цветов — по одному на каждый светодиод." },
        { line: "void setup() {", text: "Начните функцию setup: она выполняется один раз при включении." },
        { line: "FastLED.addLeds<WS2812, LED_PIN, GRB>(leds, NUM_LEDS);", text: "Сообщите библиотеке тип ленты, пин и массив светодиодов." },
        { line: "FastLED.setBrightness(200);", text: "Задайте яркость ленты." },
        { line: "void loop() {", text: "Начните функцию loop: она повторяется бесконечно." },
        { line: "fadeToBlackBy(leds, NUM_LEDS, {{25}});", text: "Вызовите функцию для заливки 25 светодиодов чёрным цветом" },
        { line: "int pos = random16(NUM_LEDS);", text: "Создайте переменную pos и присвойте ей случайное 16-битное число" },
        { line: "leds[pos] += CRGB::{{White|Red|Blue|DeepPink|Green|Indigo|Teal|Yellow}};", text: "Задайте светодиоду на позиции pos цвет" },
        { line: "FastLED.show();", text: "Покажите цвета на ленте." },
        { line: "delay(30);", text: "Вызовите функцию ожидания на 30 секунд" }
      ]
    },
    {
      id: "stage3",
      title: "Эффект «Бегущий огонёк»",
      fragments: [
        {
          free: false,
          code:
`#define LED_PIN 5
#define NUM_LEDS 30
#define POT A0
#include <FastLED.h>`
        },
        { free: false, code: "CRGB leds[NUM_LEDS];" },
        {
          free: false,
          code:
`void setup() {
  FastLED.addLeds<WS2812, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(200);
}`
        },
        {
          free: false,
          code:
`void loop() {
  fadeToBlackBy(leds, NUM_LEDS, {{40}});
  leds[pos] = CRGB::{{White|Red|Blue|DeepPink|Green|Indigo|Teal|Yellow}};
  FastLED.show();
  pos = (pos + 1) % NUM_LEDS;
  delay(30);
}`
        }
      ],
      steps: [
        { line: "#define LED_PIN 5", text: "Задайте пин, к которому подключена лента." },
        { line: "#define NUM_LEDS 30", text: "Укажите, сколько светодиодов на ленте." },
        { line: "#define POT A0", text: "Задайте пин потенциометра." },
        { line: "#include <FastLED.h>", text: "Подключите библиотеку FastLED." },
        { line: "CRGB leds[NUM_LEDS];", text: "Создайте массив цветов — по одному на каждый светодиод." },
        { line: "void setup() {", text: "Начните функцию setup: она выполняется один раз при включении." },
        { line: "FastLED.addLeds<WS2812, LED_PIN, GRB>(leds, NUM_LEDS);", text: "Сообщите библиотеке тип ленты, пин и массив светодиодов." },
        { line: "FastLED.setBrightness(200);", text: "Задайте яркость ленты." },
        { line: "void loop() {", text: "Начните функцию loop: она повторяется бесконечно." },
        { line: "fadeToBlackBy(leds, NUM_LEDS, {{40}});", text: "Вызовите функцию для заливки 40 светодиодов черным цветом" },
        { line: "leds[pos] = CRGB::{{White|Red|Blue|DeepPink|Green|Indigo|Teal|Yellow}};", text: "Задайте цвет светодиоду на позиции pos" },
        { line: "FastLED.show();", text: "Покажите цвета на ленте." },
        { line: "pos = (pos + 1) % NUM_LEDS;", text: "Увеличьте значение pos на 1 с учетом количества светодиодов" },
        { line: "delay(30);", text: "Вызовите функцию ожидания на 30 секунд" }
      ]
    },
    {
      id: "stage4",
      title: "Эффект «Дыхание» ",
      fragments: [
        {
          free: false,
          code:
`#define LED_PIN 5
#define NUM_LEDS 30
#define POT A0
#include <FastLED.h>`
        },
        { free: false, code: "CRGB leds[NUM_LEDS];" },
        {
          free: false,
          code:
`void setup() {
  FastLED.addLeds<WS2812, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(200);
}`
        },
        {
          free: false,
          code:
`void loop() {
  uint8_t brightness = beatsin8({{20}}, 5, 255);
  fill_solid(leds, NUM_LEDS, CRGB::{{White|Red|Blue|DeepPink|Green|Indigo|Teal|Yellow}});
  FastLED.setBrightness(brightness);
  FastLED.show();
}`
        }
      ],
      steps: [
        { line: "#define LED_PIN 5", text: "Задайте пин, к которому подключена лента." },
        { line: "#define NUM_LEDS 30", text: "Укажите, сколько светодиодов на ленте." },
        { line: "#define POT A0", text: "Задайте пин потенциометра." },
        { line: "#include <FastLED.h>", text: "Подключите библиотеку FastLED." },
        { line: "CRGB leds[NUM_LEDS];", text: "Создайте массив цветов — по одному на каждый светодиод." },
        { line: "void setup() {", text: "Начните функцию setup: она выполняется один раз при включении." },
        { line: "FastLED.addLeds<WS2812, LED_PIN, GRB>(leds, NUM_LEDS);", text: "Сообщите библиотеке тип ленты, пин и массив светодиодов." },
        { line: "FastLED.setBrightness(200);", text: "Задайте яркость ленты." },
        { line: "void loop() {", text: "Начните функцию loop: она повторяется бесконечно." },
        { line: "uint8_t brightness = beatsin8({{20}}, 5, 255);", text: "Установите динамическую яркость ленте." },
        { line: "fill_solid(leds, NUM_LEDS, CRGB::{{White|Red|Blue|DeepPink|Green|Indigo|Teal|Yellow}});", text: "Вызовите функцию для заливки всей ленты выбранным цветом." },
        { line: "FastLED.setBrightness(brightness);", text: "Задайте новую яркость ленты." },
        { line: "FastLED.show();", text: "Покажите цвета на ленте." }
      ]
    },
    {
      id: "stage5",
      title: "Эффект «Управление радугой»",
      fragments: [
        {
          free: false,
          code:
`#define LED_PIN 5
#define NUM_LEDS 32
#define POT A0
#include <FastLED.h>`
        },
        { free: false, code: "CRGB leds[NUM_LEDS];" },
        {
          free: false,
          code:
`void setup() {
  FastLED.addLeds<WS2812, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(200);
}`
        },
        {
          free: false,
          code:
`void loop() {
  int potValue = analogRead(POT);
  int ledsCount = map(potValue, 0, 1023, 0, NUM_LEDS);
  fill_solid(leds, NUM_LEDS, CRGB::Black);
  for (int i = 0; i < ledsCount; i++) {
    leds[i] = CHSV(i * 8, 255, 255);
  }
  FastLED.show();
  delay(20);

}`
        }
      ],
      steps: [
        { line: "#define LED_PIN 5", text: "Задайте пин, к которому подключена лента." },
        { line: "#define NUM_LEDS 32", text: "Укажите, сколько светодиодов на ленте (тут на 2 больше)." },
        { line: "#define POT A0", text: "Задайте пин потенциометра." },
        { line: "#include <FastLED.h>", text: "Подключите библиотеку FastLED." },
        { line: "CRGB leds[NUM_LEDS];", text: "Создайте массив цветов — по одному на каждый светодиод." },
        { line: "void setup() {", text: "Начните функцию setup: она выполняется один раз при включении." },
        { line: "FastLED.addLeds<WS2812, LED_PIN, GRB>(leds, NUM_LEDS);", text: "Сообщите библиотеке тип ленты, пин и массив светодиодов." },
        { line: "FastLED.setBrightness(200);", text: "Задайте яркость ленты." },
        { line: "void loop() {", text: "Начните функцию loop: она повторяется бесконечно." },
        { line: "int potValue = analogRead(POT);", text: "Считайте в переменную значение потенциометра" },
        { line: "int ledsCount = map(potValue, 0, 1023, 0, NUM_LEDS);", text: "Соотнесите значения потенциометра с количеством светодиодов" },
        { line: "fill_solid(leds, NUM_LEDS, CRGB::Black);", text: "Вызовите функцию для заливки всей ленты чёрным цветом" },
        { line: "for (int i = 0; i < ledsCount; i++) {", text: "Создайте цикл от 0 до ledsCount с шагом 1" },
        { line: "leds[i] = CHSV(i * 8, 255, 255);", text: "Внутри цикла меняйте свет по модели CHSV" },
        { line: "FastLED.show();", text: "Покажите цвета на ленте." },
        { line: "delay(20);", text: "Вызовите функцию ожидания на 20 секунд" }
      ]
    }
  ]
});
