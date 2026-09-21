window.MKB = window.MKB || {};
window.MKB.workshops = window.MKB.workshops || [];
window.MKB.workshops.push({
  id: "mk3",
  title: "МК-3: Адресная лента WS2812",
  language: "arduino",
  stages: [
    {
      id: "white",
      title: "Лента белым цветом",
      fragments: [
        {
          free: true,
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
  fill_solid(leds, NUM_LEDS, CRGB::{{White|Red|Blue}});
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
        { line: "fill_solid(leds, NUM_LEDS, CRGB::{{White|Red|Blue}});", text: "Залейте всю ленту одним цветом — выберите белый." },
        { line: "FastLED.show();", text: "Покажите цвета на ленте." }
      ]
    }
  ]
});
