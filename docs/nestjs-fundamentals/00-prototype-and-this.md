# Chương 0 — Prototype, `this`, và class trong JavaScript

> Chương này là **phần nền** cho [chương 1](01-decorators-and-metadata.md). Nếu bạn đọc chương 1 và vấp ở chỗ "`target` là `X.prototype`" — không
> hiểu `prototype` là cái gì, ở đâu ra, khác gì class — thì đọc chương này trước. Không có NestJS, không có
> decorator, không có metadata trong mười mục đầu. Chỉ JavaScript thuần. [Mục 10](#10-nối-về-decorator-và-metadata) mới nối ngược về decorator.
>
> **Chỉ cần câu trả lời cho "vì sao class lại có `prototype`"?** Đọc [mục 0](#0-trả-lời-ngắn-vì-sao-class-lại-có-prototype),
> một trang, xong thì dừng được.
>
> Mọi đoạn code dưới đây chạy được bằng `node` (lưu `.mjs`) hoặc `npx ts-node`. Bạn nên chạy thật — prototype là
> thứ đọc mãi không hiểu nhưng in ra một lần là thông.

**Mục lục**

0. [Trả lời ngắn: vì sao class lại có `prototype`?](#0-trả-lời-ngắn-vì-sao-class-lại-có-prototype)
   - [0.1 `prototype` để làm gì](#01-prototype-để-làm-gì) · [0.2 Được gì](#02-được-gì) · [0.3 Vì sao chương này vẫn dài thêm 13 mục nữa](#03-vì-sao-chương-này-vẫn-dài-thêm-13-mục-nữa)
1. [Object chỉ là một cái bảng](#1-object-chỉ-là-một-cái-bảng)
2. [Tìm không thấy thì đi hỏi chỗ khác: prototype chain](#2-tìm-không-thấy-thì-đi-hỏi-chỗ-khác-prototype-chain)
3. [`prototype` và `__proto__` là hai thứ khác nhau](#3-prototype-và-__proto__-là-hai-thứ-khác-nhau)
   - [3.1 `Foo.prototype` sinh ra cùng hàm, và built-in cũng theo đúng luật đó](#31-fooprototype-sinh-ra-cùng-lúc-với-hàm-và-built-in-cũng-theo-đúng-luật-đó)
4. [`new` làm đúng bốn việc](#4-new-làm-đúng-bốn-việc)
   - [4.1 Cái gì riêng thì khởi tạo trong constructor, cái gì chung mới lên prototype](#41-cái-gì-riêng-thì-khởi-tạo-trong-constructor-cái-gì-chung-mới-lên-prototype)
   - [4.2 Mổ từng bước một](#42-mổ-từng-bước-một) · [4.3 `return` trong constructor](#43-return-trong-constructor-primitive-bị-bỏ-qua-object-thì-thắng) · [4.4 `new.target`](#44-newtarget--hàm-tự-biết-nó-được-gọi-kiểu-gì)
   - [4.5 Thứ không `new` được](#45-thứ-không-new-được) · [4.6 `super()` phải chạy trước `this`](#46-new-trên-class-con-super-phải-chạy-trước-this) · [4.7 `Reflect.construct` và `Object.create`](#47-reflectconstruct-và-objectcreate-hai-nửa-của-new) · [4.8 `new` nằm ở đâu trong dự án này](#48-new-nằm-ở-đâu-trong-dự-án-này)
5. [`class` chỉ là cú pháp đẹp cho đúng cơ chế đó](#5-class-chỉ-là-cú-pháp-đẹp-cho-đúng-cơ-chế-đó)
   - [5.1 Method nằm trên prototype, field nằm trên instance](#51-method-nằm-trên-prototype-field-nằm-trên-instance)
   - [5.2 Vì sao `Object.keys(prototype)` ra rỗng](#52-vì-sao-objectkeysprototype-ra-rỗng)
   - [5.3 Bản chất của "syntax sugar": nhìn code sau khi biên dịch](#53-bản-chất-của-syntax-sugar-nhìn-code-sau-khi-biên-dịch)
6. [`this` được quyết định lúc gọi, không phải lúc viết](#6-this-được-quyết-định-lúc-gọi-không-phải-lúc-viết)
7. [Property descriptor — bản mô tả của một property](#7-property-descriptor--bản-mô-tả-của-một-property)
8. [`extends` chỉ là nối thêm một mắt vào chain](#8-extends-chỉ-là-nối-thêm-một-mắt-vào-chain)
9. [Boxing: primitive không phải object, nhưng vẫn `.length` được](#9-boxing-primitive-không-phải-object-nhưng-vẫn-length-được)
   - [9.1 Ba hệ quả](#91-ba-hệ-quả-nhìn-thấy-được) · [9.2 `(5).toFixed()`](#92-5tofixed-là-lỗi-cú-pháp-5tofixed-thì-không) · [9.3 Boxing và `this`](#93-boxing-và-this-sloppy-khác-strict) · [9.4 `string` với `String`](#94-string-với-string--và-vì-sao-typescript-phân-biệt)
10. [Nối về decorator và metadata](#10-nối-về-decorator-và-metadata)

- [10.1 Vì sao method decorator nhận `prototype`](#101-vì-sao-method-decorator-nhận-prototype) ·
  [10.2 Vì sao metadata dùng chung cho mọi instance](#102-vì-sao-metadata-dùng-chung-cho-mọi-instance) ·
  [10.3 Vì sao property decorator không có descriptor](#103-vì-sao-property-decorator-không-có-descriptor) ·
  [10.4 `descriptor.value` và `context.getHandler()` là cùng một hàm](#104-descriptorvalue-và-contextgethandler-là-cùng-một-hàm) ·
  [10.5 Vì sao metadata kế thừa được](#105-vì-sao-metadata-kế-thừa-được) ·
  [10.6 Script quét route của dự án đi đúng trên prototype](#106-script-quét-route-của-dự-án-đi-đúng-trên-prototype) ·
  [10.7 Vì sao DI đọc được kiểu tham số constructor](#107-vì-sao-di-đọc-được-kiểu-tham-số-constructor) ·
  [10.8 `design:type` là hàm dựng — hệ quả của boxing](#108-designtype-là-hàm-dựng-không-phải-tên-kiểu--hệ-quả-của-boxing)

11. [Bảng thuật ngữ](#11-bảng-thuật-ngữ)
12. [Sáu nhầm lẫn phổ biến](#12-sáu-nhầm-lẫn-phổ-biến)
13. [Tự kiểm chứng](#13-tự-kiểm-chứng)

---

## 0. Trả lời ngắn: vì sao class lại có `prototype`?

Nếu bạn tới đây với đúng một câu hỏi — "class là class, sao lại dính `prototype`?" — thì mục này trả lời gọn trong
một trang. Mười ba mục sau chỉ là mổ xẻ từng mảnh của câu trả lời này.

**Câu trả lời:** vì `class` trong JavaScript **là một hàm dựng (constructor function) viết cho đẹp**. Mọi hàm đều có
sẵn một property tên `prototype`, nên class cũng có. JavaScript không có cơ chế kế thừa nào khác ngoài prototype —
`class` chỉ là lớp áo mới trên đúng cơ chế cũ.

Hai đoạn dưới đây tạo ra **cùng một thứ**:

```js
// cách viết ES6
class MyClass {
  myMethod() {}
}

// cách viết ES5 — tương đương
function MyClass() {}
MyClass.prototype.myMethod = function () {};
```

Cả hai đều cho ra: một hàm tên `MyClass`, và một object `MyClass.prototype` chứa `myMethod`.

### 0.1 `prototype` để làm gì

Để **instance tra được method mà không cần giữ bản sao của method**.

```js
class MyClass {
  myMethod() {
    console.log("Hello from myMethod");
  }
}

const obj = new MyClass();
obj.myMethod(); // "Hello from myMethod"

Object.getPrototypeOf(obj) === MyClass.prototype; // true
```

Khi gọi `obj.myMethod()`, JavaScript tìm `myMethod` **trên chính `obj`** trước. Không có. Nó đi tiếp lên prototype
của `obj` — chính là `MyClass.prototype` — và tìm thấy ở đó.

```
   obj                       MyClass.prototype          Object.prototype       null
┌────────────────┐        ┌────────────────────┐     ┌──────────────────┐
│ (field riêng)  │──[[P]]▶│ myMethod           │─[[P]]▶ toString, ...   │──[[P]]▶ ×
└────────────────┘        │ constructor        │     └──────────────────┘
                          └────────────────────┘
        obj.myMethod() tìm ở đây trước → không có → đi theo mũi tên
```

Đây là lúc `prototype` được dùng: **mỗi lần `new`**, object mới được nối ngầm vào `MyClass.prototype`; và **mỗi lần
`extends`**, prototype của class con được nối lên prototype của class cha, nên class con dùng lại được method của
cha và ghi đè được method của cha.

### 0.2 Được gì

| Lợi ích              | Cụ thể là gì                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tiết kiệm bộ nhớ** | Method định nghĩa trong constructor thì mỗi instance một bản sao. Đặt trên prototype thì một triệu instance dùng chung một hàm.                                                       |
| **Kế thừa, mở rộng** | Object kế thừa từ object khác bằng cách nối chain, ghi đè bằng cách đặt property cùng tên lên chính object của mình ([mục 2](#2-tìm-không-thấy-thì-đi-hỏi-chỗ-khác-prototype-chain)). |

### 0.3 Vì sao chương này vẫn dài thêm 13 mục nữa

Câu trả lời trên đúng nhưng chưa đủ để đọc [chương 1](01-decorators-and-metadata.md). Bốn chỗ hay vấp, mỗi chỗ có một mục riêng:

| Vấp ở đâu                                               | Đọc mục                                                              |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| `Foo.prototype` với `obj.__proto__` là một hay hai thứ? | [mục 3](#3-prototype-và-__proto__-là-hai-thứ-khác-nhau)              |
| `new` thật ra làm gì                                    | [mục 4](#4-new-làm-đúng-bốn-việc)                                    |
| Method lên prototype, còn field thì không — vì sao      | [mục 5.1](#51-method-nằm-trên-prototype-field-nằm-trên-instance)     |
| `class` biên dịch ra đúng cái gì                        | [mục 5.3](#53-bản-chất-của-syntax-sugar-nhìn-code-sau-khi-biên-dịch) |

Và câu hỏi đích của cả bộ tài liệu — vì sao decorator nhận `X.prototype` chứ không nhận instance — nằm ở
[mục 10](#10-nối-về-decorator-và-metadata).

---

## 1. Object chỉ là một cái bảng

Một object trong JavaScript, bỏ hết thuật ngữ đi, là **một cái bảng tra: tên → giá trị**.

```js
const user = { name: "Thắng", age: 30 };
```

| key      | value     |
| -------- | --------- |
| `"name"` | `"Thắng"` |
| `"age"`  | `30`      |

`user.name` nghĩa là "tìm dòng có key `name` trong bảng này". Hết. Hàm cũng là giá trị, nên method không phải loại
đặc biệt gì — chỉ là một dòng trong bảng mà value tình cờ là hàm:

```js
const user = {
  name: "Thắng",
  greet() {
    return "hi";
  },
};
```

| key       | value                                  |
| --------- | -------------------------------------- |
| `"name"`  | `"Thắng"`                              |
| `"greet"` | `[Function]` ← hàm cũng chỉ là giá trị |

---

## 2. Tìm không thấy thì đi hỏi chỗ khác: prototype chain

Đây là **toàn bộ** cơ chế prototype, một câu:

> Mỗi object có một liên kết ẩn trỏ tới **một object khác**. Tra key không thấy trong bảng của mình, JavaScript đi
> theo liên kết đó và tra tiếp ở bảng kia. Không thấy nữa thì đi tiếp. Tới cuối chuỗi vẫn không thấy → `undefined`.

Object bị trỏ tới đó gọi là **prototype** của object này. Chuỗi liên kết đó gọi là **prototype chain**.

Dựng tay một chuỗi để thấy rõ, bằng `Object.create(x)` — "tạo object rỗng mà prototype là `x`":

```js
const animal = { legs: 4, speak: () => "..." };
const dog = Object.create(animal); // dog rỗng, prototype = animal
dog.speak = () => "woof"; // dog tự có speak riêng

console.log(dog.speak()); // "woof"  ← thấy ngay trong bảng của dog
console.log(dog.legs); // 4       ← dog không có, hỏi tiếp animal
console.log(dog.color); // undefined ← hết chuỗi, không thấy
```

Vẽ ra thì thấy ngay nó là một **dây chuyền hỏi tiếp**: mỗi object biết đúng **một** object để hỏi khi mình không
có câu trả lời.

```
 dog.legs — JavaScript đi tìm theo đúng thứ tự này:

 ① dog                     ② animal                  ③ Object.prototype        ④ hết
┌─────────────────┐  hỏi  ┌─────────────────┐  hỏi  ┌───────────────────┐
│ speak: woof     │ ────▶ │ legs: 4         │ ────▶ │ toString, ...     │ ────▶ null
│ (không có legs) │       │ speak: "..."    │       │ (không có legs)   │
└─────────────────┘       └─────────────────┘       └───────────────────┘
   object bạn viết             prototype                prototype               không ai
   tên ra để truy cập          của dog                  của animal              trả lời nữa
                                  ▲
                          tìm thấy legs ở đây → trả 4, dừng, không hỏi tiếp
```

Ba điều rút ra, và cả ba đều sẽ dùng lại ở [mục 9](#9-boxing-primitive-không-phải-object-nhưng-vẫn-length-được). Chú ý: **cả ba đều nói về một chiều duy nhất — từ object bạn viết
tên ra, đi sang prototype của nó.** Không có chiều ngược lại: `animal` hoàn toàn không biết `dog` tồn tại.

1. **Đọc: hỏi chính mình trước, thấy thì dừng ngay.** `dog.speak` có sẵn trên `dog`, nên `animal.speak` không bao giờ
   được ngó tới — nó **bị che**. Đó chính là "override": muốn thay một method của prototype, chỉ cần đặt property
   cùng tên lên object của mình.
2. **Ghi: luôn ghi vào chính object bạn gán, không đi sang prototype.** `dog.legs = 3` **không** sửa `animal.legs`;
   nó tạo một dòng `legs` mới trên chính `dog`. Đọc thì đi tiếp sang prototype, ghi thì đứng yên tại chỗ.
3. **Chia sẻ, không copy.** `dog` không chứa bản sao của `legs` — nó chỉ mượn của `animal`. Nên sửa
   `animal.legs = 2` thì `dog.legs` đọc ra `2` ngay, miễn là `dog` chưa tự có `legs` riêng theo điều 2.

```js
dog.legs; // 4  ← dog không có, mượn của animal
dog.legs = 3; // ghi vào chính dog, animal không bị đụng
animal.legs; // 4
animal.legs = 2; // sửa animal
dog.legs; // 3  ← dog đã có legs riêng, không hỏi animal nữa
```

> **Gặp chữ "tầng trên / tầng dưới" ở tài liệu khác thì hiểu thế nào.** Nhiều người vẽ chuỗi này theo chiều dọc và
> gọi object bạn viết tên ra là "dưới", prototype của nó là "trên" — tức "đi lên" nghĩa là ô ② rồi ③ trong hình trên.
> Chương này tránh dùng hai chữ đó vì hình vẽ ngang, nhưng bạn sẽ gặp chúng ở nơi khác.

Liên kết ẩn đó chuẩn gọi là `[[Prototype]]`. Xem và đổi nó bằng API tử tế:

```js
Object.getPrototypeOf(dog) === animal; // true
Object.setPrototypeOf(dog, null); // cắt chain (đừng làm trong code thật — chậm)
```

---

## 3. `prototype` và `__proto__` là hai thứ khác nhau

Đây là chỗ gây nhầm nhiều nhất, và là lý do chính khiến [chương 1](01-decorators-and-metadata.md) khó đọc. Hai cái tên gần giống nhau nhưng nghĩa
khác hẳn:

| Viết            | Nằm trên    | Nghĩa                                                           |
| --------------- | ----------- | --------------------------------------------------------------- |
| `obj.__proto__` | mọi object  | **prototype của chính `obj`** — "tôi đi hỏi ai"                 |
| `Foo.prototype` | chỉ **hàm** | object sẽ được gán làm prototype cho **instance mới** của `Foo` |

Nói cách khác: `Foo.prototype` **không phải** prototype của `Foo`. Nó là "cái tủ dùng chung mà `Foo` phát cho con
của nó".

```js
function Foo() {}
const f = new Foo();

Object.getPrototypeOf(f) === Foo.prototype; // true  ← prototype của instance
Object.getPrototypeOf(Foo) === Function.prototype; // true  ← prototype của chính hàm Foo
```

```
  f  ──[[Prototype]]──▶  Foo.prototype  ──[[Prototype]]──▶  Object.prototype
                               ▲
                               │ .prototype   (một property thường của hàm Foo)
                             Foo
```

Ghim một câu: **`Foo.prototype` là tài sản của `Foo`, dành cho con của `Foo` dùng.** Mỗi lần thấy `X.prototype` ở
[chương 1](01-decorators-and-metadata.md) hay trong code Nest, đọc nó là **"cái tủ dùng chung của mọi instance `X`"**, không phải "class X".

> `__proto__` là accessor cũ, giữ lại cho tương thích. Code thật dùng `Object.getPrototypeOf`. Nhắc `__proto__` ở
> đây vì bạn sẽ thấy nó khi `console.log` một object trong Chrome DevTools.

### 3.1 `Foo.prototype` sinh ra cùng lúc với hàm, và built-in cũng theo đúng luật đó

Bạn không tạo `Foo.prototype`. Vừa khai báo `function Foo() {}` là engine đã treo sẵn lên nó một object, ban đầu
chỉ có **một** dòng: `constructor`, trỏ ngược về `Foo`.

```js
function Person(firstName, lastName) {
  this.firstName = firstName;
  this.lastName = lastName;
}

Object.getOwnPropertyNames(Person.prototype); // ["constructor"]
Person.prototype.constructor === Person; // true
```

Mọi thứ bạn gắn thêm — `Person.prototype.showFullName = ...` — chỉ là thêm dòng vào cái bảng có sẵn đó. Vì thế
`instance.constructor` là đường quay ngược từ instance về class ([mục 5.3](#53-bản-chất-của-syntax-sugar-nhìn-code-sau-khi-biên-dịch) dùng lại). Và `Object.create(x)` ở [mục 2](#2-tìm-không-thấy-thì-đi-hỏi-chỗ-khác-prototype-chain)
khác `new` đúng một điểm: nó không đi qua hàm dựng nào, nên object nó tạo ra không có `constructor` riêng.

Các object dựng sẵn của JavaScript không có luật riêng. `{}` là viết tắt của `new Object()`, `[]` của `new Array()`,
literal regex của `new RegExp()`:

```js
Object.getPrototypeOf({}) === Object.prototype; // true
Object.getPrototypeOf([]) === Array.prototype; // true — .push, .map nằm ở đây
Object.getPrototypeOf(/x/) === RegExp.prototype; // true
Object.getPrototypeOf(new Date()) === Date.prototype; // true
Object.getPrototypeOf(Object.prototype); // null — đỉnh chuỗi, không đi tiếp được
```

Nên `[1, 2].map(...)`, `"abc".toUpperCase()` ([mục 9](#9-boxing-primitive-không-phải-object-nhưng-vẫn-length-được)) và `new User().greet()` ([mục 5](#5-class-chỉ-là-cú-pháp-đẹp-cho-đúng-cơ-chế-đó)) là **một** cơ chế: tra không
thấy trên chính nó, đi lên tủ dùng chung của hàm dựng. `Object.prototype` là tủ cuối cùng mọi chuỗi đều ghé qua —
`toString`, `hasOwnProperty` nằm ở đó — và prototype của nó là `null`.

---

## 4. `new` làm đúng bốn việc

`new Foo(a, b)` không phải phép màu. Nó là bốn bước, viết tay được:

```js
function myNew(Ctor, ...args) {
  const obj = Object.create(Ctor.prototype); // 1. object rỗng, prototype = Ctor.prototype
  const ret = Ctor.apply(obj, args); //        2. chạy Ctor với this = obj
  return typeof ret === "object" && ret !== null ? ret : obj; // 3-4. trả obj (trừ khi Ctor return object)
}
```

Kiểm chứng:

```js
function User(name) {
  this.name = name; // ghi vào instance (mục 2, điều 2: ghi luôn ghi vào chính object được gán)
}
User.prototype.greet = function () {
  return `hi ${this.name}`; // ghi vào tủ dùng chung
};

const u = myNew(User, "Thắng");
console.log(u.greet()); // "hi Thắng"
console.log(Object.keys(u)); // ["name"]  ← greet KHÔNG nằm trên u
```

`name` nằm trên instance. `greet` nằm trên `User.prototype`, **một bản duy nhất** cho cả triệu instance. Đó là lý do
kỹ thuật tại sao method được đặt ở prototype: một hàm, dùng chung, thay vì copy vào từng object.

### 4.1 Cái gì riêng thì khởi tạo trong constructor, cái gì chung mới lên prototype

[Mục 2](#2-tìm-không-thấy-thì-đi-hỏi-chỗ-khác-prototype-chain) điều 3 — "chia sẻ, không copy" — là lợi ích khi thứ được chia sẻ là hàm, và là **bẫy** khi thứ được chia sẻ
là dữ liệu sửa được. Thử để một mảng lên prototype cho "tiết kiệm":

```js
function Person(firstName, lastName) {
  this.firstName = firstName;
  this.lastName = lastName;
}
Person.prototype.friends = []; // ✗ một mảng, dùng chung
Person.prototype.addFriend = function (friend) {
  this.friends.push(friend); // this.friends không có trên instance → lấy mảng trên prototype
};

const canh = new Person("Canh", "Dinh");
const justin = new Person("Justin", "Vo");
canh.addFriend(justin);

justin.friends; // [Person { firstName: "Justin", ... }] — justin chưa thêm ai, nhưng "có bạn"
canh.friends === justin.friends; // true — cùng một mảng
```

`push` không ghi property mới, nó **sửa bên trong** mảng mà cả hai instance đang trỏ tới. Luật "ghi thì ghi vào
chính object được gán" chỉ áp dụng cho phép gán `this.friends = ...`, không áp dụng cho việc sửa nội dung một object
mượn được từ prototype.

Sửa: mọi trạng thái riêng của từng object khởi tạo trong constructor, để mỗi lần `new` có một mảng mới:

```js
function Person(firstName, lastName) {
  this.firstName = firstName;
  this.lastName = lastName;
  this.friends = []; // ✓ mỗi instance một mảng
}
Person.prototype.showFullName = function () {
  return `${this.firstName} ${this.lastName}`;
};
Person.prototype.addFriend = function (friend) {
  this.friends.push(friend);
};

const canh = new Person("Canh", "Dinh");
canh.addFriend(new Person("Justin", "Vo"));
canh.friends.length; // 1
new Person("Micheal", "Huynh").friends.length; // 0
```

Quy tắc chia đôi rất gọn: **constructor giữ những gì khác nhau giữa các object; prototype giữ những gì giống nhau** —
thường là hàm. Cú pháp `class` ép bạn đi đúng đường này: field `friends = []` biên dịch thành `this.friends = []`
trong constructor ([mục 5.3](#53-bản-chất-của-syntax-sugar-nhìn-code-sau-khi-biên-dịch)), còn method tự lên prototype. Muốn tái hiện lỗi trên bằng `class` thì phải cố tình viết
`Person.prototype.friends = []` sau khi khai báo — gần như không ai làm thế, và đó là một điểm cộng thật của `class`
ngoài "viết đẹp hơn".

### 4.2 Mổ từng bước một

Bốn dòng của `myNew` ở trên, mỗi dòng có một chi tiết đáng nhớ.

**Bước 1 — `Object.create(Ctor.prototype)`.** Object mới _rỗng_: không có property riêng nào, chỉ có một liên kết
`__proto__` trỏ tới `Ctor.prototype` ([mục 3](#3-prototype-và-__proto__-là-hai-thứ-khác-nhau)). Liên kết này chốt tại đây, ngay lúc `new` chạy — sửa `Ctor.prototype`
**sau đó** không kéo theo instance cũ.

```js
function User(name) {
  this.name = name;
}
User.prototype.greet = function () {
  return "v1";
};
const u = new User("Thắng");

User.prototype.greet = function () {
  return "v2";
};
u.greet(); // "v2"  ← vẫn thấy, vì u trỏ tới CÙNG object prototype, chỉ nội dung đổi

User.prototype = { greet: () => "v3" }; // thay cả cái tủ bằng tủ khác
u.greet(); // "v2"  ← u vẫn trỏ tủ cũ
new User("x").greet(); // "v3" ← instance mới mới trỏ tủ mới
```

Nếu `Ctor.prototype` không phải object (ai đó gán `Foo.prototype = 42`), engine lặng lẽ dùng `Object.prototype`:

```js
function Bad() {}
Bad.prototype = 42;
Object.getPrototypeOf(new Bad()) === Object.prototype; // true
```

**Bước 2 — `Ctor.apply(obj, args)`.** Đây chính là **new binding** của `this` sẽ nói ở [mục 6](#6-this-được-quyết-định-lúc-gọi-không-phải-lúc-viết): trong thân constructor,
`this` là object vừa tạo ở bước 1 — không phải class, không phải `undefined`. Mọi `this.x = ...` viết trong
constructor là ghi property **riêng** lên instance đó.

**Bước 3 — xét giá trị `Ctor` trả về.** [Mục 4.3](#43-return-trong-constructor-primitive-bị-bỏ-qua-object-thì-thắng) ngay dưới.

**Bước 4 — trả về object.** Vì thế `const u = new User(...)` luôn có giá trị, kể cả khi constructor không viết
`return` dòng nào.

Một hệ quả ít người để ý: `new` **bỏ qua** `this` đã bind sẵn, vì bước 2 tự chỉ định `this` mới.

```js
const Bound = User.bind({ name: "bị bỏ qua" }, "Thắng"); // bind cả this lẫn tham số đầu
const b = new Bound();
b.name; // "Thắng"        ← tham số bind vẫn giữ
b instanceof User; // true ← this bind bị vứt, prototype vẫn là User.prototype
```

### 4.3 `return` trong constructor: primitive bị bỏ qua, object thì thắng

Bước 3 có đúng một luật: **trả về object (hoặc hàm, mảng) thì object đó là kết quả của `new`; trả về primitive
(number, string, boolean, `undefined`, `null`) thì bị bỏ qua** và `new` vẫn trả object vừa dựng.

```js
function F() {
  this.a = 1;
  return 42; // primitive → vứt
}
new F(); // F { a: 1 }

function G() {
  this.a = 1;
  return { b: 2 }; // object → thắng
}
new G(); // { b: 2 }
new G() instanceof G; // false ← object trả về không đi qua Object.create(G.prototype)
```

`class` cũng đúng luật này — nó không phải ngoại lệ:

```js
class T {
  constructor() {
    return { hacked: true };
  }
}
new T() instanceof T; // false
```

Luật "object thì thắng" không phải trò vui; nó là chỗ dựa của vài mẫu quen mặt — singleton, cache instance, factory
giả dạng constructor:

```js
class Config {
  constructor() {
    if (Config.instance) return Config.instance; // trả object cũ
    Config.instance = this;
  }
}
new Config() === new Config(); // true
```

Ngược lại, đây cũng là nguồn của một loại bug khó thấy: lỡ tay `return this.something` trong constructor và cả object
trả về sai kiểu mà TypeScript _không_ báo — kiểu khai báo của `new C()` luôn là `C`, TS không mô hình hoá luật này.

### 4.4 `new.target` — hàm tự biết nó được gọi kiểu gì

Trong thân một hàm, `new.target` là `undefined` khi bị gọi thường, và là **chính hàm dựng được `new`** khi gọi bằng
`new`:

```js
function H() {
  console.log(new.target === H);
}
H(); // false (new.target là undefined)
new H(); // true
```

Hai công dụng thực tế:

```js
// 1. Bắt lỗi quên new (thời trước class, đây là lỗi phổ biến nhất)
function User(name) {
  if (!new.target) return new User(name);
  this.name = name;
}
User("Thắng").name; // "Thắng" — gọi thiếu new vẫn chạy đúng

// 2. Class "trừu tượng": cấm new trực tiếp, chỉ cho new lớp con
class AbstractGuard {
  constructor() {
    if (new.target === AbstractGuard)
      throw new TypeError("AbstractGuard là lớp cơ sở, không new trực tiếp");
  }
}
class JwtGuard extends AbstractGuard {}
new JwtGuard(); // ok
new AbstractGuard(); // TypeError
```

Điểm quan trọng cho [mục 4.6](#46-new-trên-class-con-super-phải-chạy-trước-this): khi `new Q()` với `class Q extends P`, thì **trong constructor của `P`**, `new.target`
vẫn là `Q` — không phải `P`. Nhờ vậy object được dựng với `Q.prototype`, và `class` cơ sở luôn biết lớp con nào đang
thật sự được khởi tạo.

### 4.5 Thứ không `new` được

Một hàm JavaScript có thể mang hai "cổng": `[[Call]]` (gọi thường) và `[[Construct]]` (gọi bằng `new`). Không phải
hàm nào cũng có cả hai.

| Viết thế này                                       | Gọi thường  | `new` | Có `.prototype`?     |
| -------------------------------------------------- | ----------- | ----- | -------------------- |
| `function f() {}`                                  | ✓           | ✓     | ✓                    |
| `class C {}`                                       | ✗ TypeError | ✓     | ✓                    |
| `const f = () => {}`                               | ✓           | ✗     | ✗                    |
| `{ m() {} }` (method shorthand / method của class) | ✓           | ✗     | ✗                    |
| `async function f() {}`                            | ✓           | ✗     | ✗                    |
| `function* g() {}`                                 | ✓           | ✗     | ✓ (nhưng khác nghĩa) |

```js
const arrow = () => {};
new arrow(); // TypeError: arrow is not a constructor

const o = { m() {} };
new o.m(); // TypeError: o.m is not a constructor

class C {}
C(); // TypeError: Class constructor C cannot be invoked without 'new'
```

Ba hệ quả hằng ngày:

1. **Arrow function không bao giờ làm method của prototype cho ra hồn** — nó không có `prototype`, và `this` của nó
   đóng cứng theo nơi viết ([mục 6](#6-this-được-quyết-định-lúc-gọi-không-phải-lúc-viết)), nên không nhận được instance.
2. **Class bắt buộc `new`** — đây là điểm `class` nghiêm hơn `function`, và là lý do `AppService()` viết thiếu `new`
   nổ ngay thay vì âm thầm ghi biến lên `globalThis`.
3. `Date()` và `new Date()` là **hai thứ khác nhau**: `typeof Date()` là `"string"`, `typeof new Date()` là
   `"object"` — di sản của các hàm dựng built-in đời đầu.

### 4.6 `new` trên class con: `super()` phải chạy trước `this`

Với `class B extends A`, `new B()` **không** tự tạo object ở constructor của `B`. Thứ tự thật sự là:

```
new B(args)
  → chạy constructor B: this chưa tồn tại (ở trạng thái TDZ)
  → super(...) → chạy constructor A (và A gọi tiếp lên trên nếu còn)
      → lớp gốc nhất mới thật sự tạo object, prototype = new.target.prototype = B.prototype
  → super() trả về: this bây giờ mới dùng được trong B
  → chạy field initializer của B (field = ... biên dịch thành gán trong constructor)
  → chạy phần thân còn lại của constructor B
```

Vì thế đụng `this` trước `super()` là lỗi thật, không phải quy ước phong cách:

```js
class Der extends P {
  constructor() {
    this.x = 1; // ReferenceError: Must call super constructor ... before accessing 'this'
    super();
  }
}
```

Và class con không viết `constructor` thì được cấp một cái ngầm định `constructor(...args) { super(...args); }` —
đó là lý do `PrismaService extends PrismaClient` ([src/shared/services/prisma.service.ts](../../src/shared/services/prisma.service.ts))
không viết constructor nào mà vẫn chạy đúng constructor của `PrismaClient`.

**Cái bẫy kinh điển** nằm ở thứ tự "super trước, field của con sau": nếu constructor lớp cha gọi một method đã bị lớp
con ghi đè, method đó chạy khi field của lớp con **chưa** được gán.

```js
class A {
  constructor() {
    this.init(); // gọi bản của lớp con
  }
  init() {}
}
class B extends A {
  value = 1; // gán SAU khi super() xong
  init() {
    console.log("value =", this.value);
  }
}
new B(); // "value = undefined"
```

Quy tắc an toàn: **constructor lớp cha đừng gọi method có thể bị ghi đè.** Trong NestJS chuyện này hiếm gặp vì công
việc khởi tạo thật nằm ở `onModuleInit` — vòng đời do Nest gọi _sau khi_ mọi constructor đã xong ([mục 6](#6-this-được-quyết-định-lúc-gọi-không-phải-lúc-viết)), đúng như
`PrismaService.onModuleInit` mở kết nối chứ không mở trong constructor.

Dự án dùng `extends` + `super()` ở hai chỗ dễ thấy:

```ts
// src/shared/exceptions/validate.exception.ts — chuyển payload lên cho constructor cha
export class ValidateException extends BadRequestException {
  constructor(details: ErrorDetailDto[], message = "Validation failed") {
    super({
      statusCode: HttpStatus.BAD_REQUEST,
      error: ErrorCode.VALIDATION_FAILED,
      message,
      details,
    });
  }
}

// src/dtos/brand/brand.dto.ts — DTO con gọi super rồi copy tiếp phần của mình
export class BrandWithBrandTranslationsResponseDto extends BaseBrandResponseDto {
  constructor(data?: BrandWithBrandTranslationsResponseDto) {
    super(data);
    if (data) Object.assign(this, data);
  }
}
```

Để ý tham số `data?` **có dấu hỏi**: [mục 4.8](#48-new-nằm-ở-đâu-trong-dự-án-này) giải thích vì sao nó buộc phải không bắt buộc.

### 4.7 `Reflect.construct` và `Object.create`: hai nửa của `new`

`new` là "tạo object theo prototype" + "chạy constructor". Tách đôi ra thì được hai công cụ, mỗi cái dùng một nửa:

```js
// Chỉ nửa đầu: có prototype, KHÔNG chạy constructor
const u = Object.create(User.prototype);
u.greet(); // method mượn được từ prototype
Object.keys(u); // [] ← constructor chưa chạy nên chưa có field nào

// Cả hai nửa, nhưng gọi được như một hàm bình thường
Reflect.construct(User, ["Thắng"]); // ≡ new User("Thắng")
Reflect.construct(User, ["Thắng"], Admin); // chạy User, nhưng prototype = Admin.prototype
```

`Reflect.construct(Ctor, argsArray)` chính là `new` ở dạng gọi được với **mảng tham số động** — thứ mà cú pháp `new`
không làm trực tiếp được (`new Ctor(...args)` với spread là cách viết tương đương gần nhất, và cũng là cách NestJS
dùng thật, xem 4.8). Tham số thứ ba là `new.target` do bạn tự chỉ định — nền tảng để kế thừa các built-in như
`Array`, `Error` trong code biên dịch xuống ES5.

`Object.create(proto)` thì ngược lại: rẻ hơn, không chạy logic khởi tạo, nên object ra lò **thiếu mọi field riêng**.
Đó là bẫy khi hồi sinh object từ JSON — `JSON.parse` cho ra object thuần, prototype là `Object.prototype`, không có
method nào của class. `class-transformer` sinh ra để lấp đúng khoảng đó ([chương 7](07-dto-validation-transformation-serialization.md)).

### 4.8 `new` nằm ở đâu trong dự án này

Ba chỗ, và cả ba đều là `new` do **framework gọi hộ**, không phải bạn gõ:

1. **DI container dựng provider.** Nest gom xong danh sách dependency rồi gọi đúng một dòng — `node_modules/@nestjs/core/injector/injector.js:373`:

   ```js
   instanceHost.instance = new metatype(...instances);
   ```

   `metatype` là class có `@Injectable()`, `instances` là các object đã dựng trước đó theo thứ tự tham số constructor.
   Thứ tự ấy đọc được nhờ metadata `design:paramtypes` ([mục 10.7](#107-vì-sao-di-đọc-được-kiểu-tham-số-constructor)). Nói cách khác: **DI không có phép màu nào ngoài
   `new` với đúng thứ tự tham số** — [chương 6](06-modules-and-dependency-injection.md) mổ kỹ.

2. **`class-transformer` dựng DTO.** `plainToInstance` tạo instance đích bằng — `node_modules/class-transformer/cjs/TransformOperationExecutor.js:147`:

   ```js
   newValue = new targetType();
   ```

   **Không tham số.** Đó là lý do mọi DTO trong `src/dtos/` viết `constructor(data?: Dto)` với dấu `?`: nếu tham số
   bắt buộc, `new targetType()` sẽ chạy với `data === undefined` và constructor nổ ngay giữa pipe. Cũng vì thế
   constructor DTO chỉ được làm mỗi việc `Object.assign` — mọi logic nặng hơn sẽ chạy cả ở đường `plainToInstance`
   lẫn đường bạn tự `new`.

3. **Bạn `new` exception và vài object nhỏ.** `throw new ValidateException(...)`, `new BadRequestException(...)`,
   `new Logger(PrismaService.name)` — chỗ duy nhất `new` xuất hiện trong code dự án một cách lộ thiên. Service,
   controller, guard thì **không bao giờ** `new` bằng tay: làm thế là dựng một object nằm ngoài container, không có
   dependency nào được tiêm ([chương 6](06-modules-and-dependency-injection.md)).

---

## 5. `class` chỉ là cú pháp đẹp cho đúng cơ chế đó

```js
class User {
  constructor(name) {
    this.name = name;
  }
  greet() {
    return `hi ${this.name}`;
  }
}
```

Tương đương gần hết với đoạn `function User` ở [mục 4](#4-new-làm-đúng-bốn-việc). `class` **không** mang lại một mô hình object mới — vẫn là
constructor + prototype, chỉ khác cách viết (và thêm vài luật chặt hơn: phải gọi bằng `new`, chạy ở strict mode,
method không enumerable).

```js
typeof User; // "function"  ← class là hàm
User.prototype.greet; // [Function: greet]  ← method nằm ở đây
new User("a").greet === User.prototype.greet; // true  ← dùng chung, không copy
```

### 5.1 Method nằm trên prototype, field nằm trên instance

Phân biệt này là **gốc rễ** của toàn bộ [mục 9](#9-boxing-primitive-không-phải-object-nhưng-vẫn-length-được). In ra để thấy:

```js
class Dto {
  name = "chưa có"; // field  → tạo trên INSTANCE, lúc chạy constructor
  age; // field không giá trị → cũng vậy
  validate() {} // method → đặt trên Dto.prototype, lúc định nghĩa class
}

console.log(Object.getOwnPropertyNames(Dto.prototype)); // ["constructor", "validate"]
console.log(Object.getOwnPropertyNames(new Dto())); // ["name", "age"]
```

| Thứ bạn viết trong class | Sống ở đâu    | Có từ lúc nào                           |
| ------------------------ | ------------- | --------------------------------------- |
| `greet() {}`             | `X.prototype` | lúc class được định nghĩa (import file) |
| `name = "x"`             | từng instance | lúc `new X()` chạy                      |
| `static ten = 1`         | chính `X`     | lúc class được định nghĩa               |
| `get full() {}`          | `X.prototype` | lúc class được định nghĩa               |

Câu quan trọng nhất của cả chương: **lúc class vừa được định nghĩa, method đã tồn tại nhưng field thì chưa — chưa có
instance nào cả.** Giữ câu này, [mục 10.3](#103-vì-sao-property-decorator-không-có-descriptor) sẽ tự sáng.

### 5.2 Vì sao `Object.keys(prototype)` ra rỗng

```js
class A {
  hello() {}
}

Object.keys(A.prototype); // []          ← ??
Object.getOwnPropertyNames(A.prototype); // ["constructor", "hello"]
```

Không phải `hello` biến mất. Method của class được đặt với cờ `enumerable: false`, và `Object.keys` / `for...in` /
spread chỉ nhìn property **enumerable**. Muốn liệt kê method thì dùng `Object.getOwnPropertyNames`.

[Chương 1](01-decorators-and-metadata.md) có một đoạn đúng về chỗ này: `Object.keys(ManageProductController.prototype.getManageProducts)` ra `[]`.
Cùng một nguyên nhân họ hàng — `Object.keys` không phải cách để soi cấu trúc thật của object.

### 5.3 Bản chất của "syntax sugar": nhìn code sau khi biên dịch

"Sugar" nghĩa là: cú pháp mới, **không có cơ chế mới**. Cách kiểm chứng duy nhất là nhìn thứ TypeScript nhả ra. Dự án
đặt `target: ES2021` ([tsconfig.json:11](../../tsconfig.json#L11)), Node hiểu `class`, nên `tsc` giữ nguyên từ khoá —
nhưng vẫn phải **kéo field và decorator ra ngoài**, vì hai thứ đó không phải cú pháp ES2021:

```ts
// nguồn
class Foo extends Base {
  count = 0;
  static total = 1;
  constructor(private readonly dep: string) {
    super();
  }
  @SetMetadata("k", "v")
  hello(id: string): string {
    return id;
  }
}
```

```js
// tsc --target ES2021 nhả ra (rút gọn)
class Foo extends Base {
  constructor(dep) {
    super();
    this.dep = dep; //  ← parameter property → gán trong constructor
    this.count = 0; //  ← field → gán trong constructor, lúc `new`
  }
  hello(id) {
    return id;
  }
}
Foo.total = 1; //        ← static → gán thẳng lên class, sau khi class xong

__decorate(
  [
    SetMetadata("k", "v"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", String),
  ],
  Foo.prototype, // ← target: cái tủ dùng chung
  "hello", //       ← key
  null, //          ← desc: null = "tự lấy bằng getOwnPropertyDescriptor"
);
```

Bốn điều đọc được thẳng từ output, không cần tin ai:

1. **Field thành dòng gán trong constructor.** Đó là bằng chứng cho [mục 5.1](#51-method-nằm-trên-prototype-field-nằm-trên-instance): `count` chỉ tồn tại khi `new` chạy.
   Kiểu (`: string`) biến mất hoàn toàn — TypeScript xoá kiểu, không dịch kiểu.
2. **Decorator thành một lời gọi hàm nằm sau class**, với `Foo.prototype` và `"hello"` là tham số literal. Toàn bộ
   [chương 1](01-decorators-and-metadata.md) nằm trong ba dòng `__decorate(...)`. Khi bạn thấy `target === Foo.prototype` ở đó, giờ bạn biết
   nó đến từ đâu: người viết `tsc` gõ đúng chữ `Foo.prototype` vào.
3. **`__metadata("design:type", Function)`** là thứ cờ `emitDecoratorMetadata` thêm vào — TypeScript tự dán kiểu
   lên cùng chỗ với decorator của bạn. Chi tiết ở [phụ lục A §5](appendix-a-reflect-metadata-internals.md#5-ba-nhãn-typescript-tự-dán-designtype-designparamtypes-designreturntype).
4. **`__decorate` ưu tiên `Reflect.decorate` nếu có** — mà `reflect-metadata` cung cấp đúng hàm đó. Nên trong dự án,
   decorator của bạn thực tế được thư viện áp, không phải đoạn `for` dự phòng.

Còn hạ `target` xuống `ES5` — nơi không có `class` — thì thấy hết đáy:

```js
var Foo = (function (_super) {
  __extends(Foo, _super); //                 ← nối hai chain (mục 8)
  function Foo(dep) {
    var _this = _super.call(this) || this; // ← super()
    _this.dep = dep;
    _this.count = 0;
    return _this;
  }
  Foo.prototype.hello = function (id) {
    return id;
  }; //                                        ← method = gán lên prototype (mục 4)
  Foo.total = 1;
  __decorate([...], Foo.prototype, "hello", null);
  return Foo;
})(Base);
```

Đúng đoạn `function User` + `User.prototype.greet = ...` ở [mục 4](#4-new-làm-đúng-bốn-việc). Không có gì khác.

**Vậy `class` thêm gì ngoài cách viết?** Vài luật chặt hơn, tất cả kiểm chứng được bằng `node`:

| Luật                            | Bằng chứng                                                                                    | Vì sao đáng nhớ                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Phải gọi bằng `new`             | `A()` → `TypeError: Class constructor A cannot be invoked without 'new'`                      | function-style thì `User("x")` chạy êm và ghi `name` lên `globalThis`                                        |
| Không hoisting                  | `new B()` trước dòng `class B {}` → `ReferenceError: Cannot access 'B' before initialization` | function declaration thì gọi trước khai báo được                                                             |
| Body luôn strict mode           | gán biến chưa khai báo trong method → `ReferenceError`                                        | và `this` không bị boxing ([mục 9.3](#93-boxing-và-this-sloppy-khác-strict))                                 |
| Method `enumerable: false`      | `Object.keys(A.prototype)` → `[]`; function-style → `["m"]`                                   | [mục 5.2](#52-vì-sao-objectkeysprototype-ra-rỗng); là lý do Nest cần `MetadataScanner` thay vì `Object.keys` |
| `A.prototype.constructor === A` | `true`                                                                                        | `instance.constructor` là cách quay ngược từ instance về class                                               |

> Với `target` ≥ `ES2022` và `useDefineForClassFields: true`, field được giữ nguyên cú pháp và định nghĩa bằng
> `Object.defineProperty` thay vì gán `this.x =` — khác một chi tiết về accessor, không đổi kết luận "field nằm trên
> instance". Dự án đang ở `ES2021` nên bạn thấy dạng gán như trên.

---

## 6. `this` được quyết định lúc gọi, không phải lúc viết

Method nằm trên prototype và dùng chung, vậy `this.name` lấy `name` của ai? Của **object đứng trước dấu chấm lúc
gọi**:

```js
const u1 = new User("A");
const u2 = new User("B");

u1.greet(); // "hi A"   ← this = u1
u2.greet(); // "hi B"   ← this = u2, vẫn cùng một hàm greet
```

Cùng một hàm, `this` khác nhau. Và vì `this` do **cách gọi** quyết định, tách hàm ra khỏi object là mất `this`:

```js
const g = u1.greet;
g(); // TypeError: Cannot read properties of undefined (reading 'name')
g.call(u1); // "hi A"       ← chỉ định this thủ công
u1.greet.bind(u1)(); // "hi A"  ← đóng cứng this
```

Hai hệ quả bạn sẽ gặp trong dự án:

- Truyền `this.handler` làm callback (cho `setTimeout`, event listener, `array.map`) thì phải `.bind(this)` hoặc bọc
  arrow function, nếu không `this` rỗng.
- Arrow function **không** có `this` riêng — nó lấy `this` của nơi nó được viết. Vì vậy `handler = () => {...}` viết
  dạng field thì `this` luôn đúng, nhưng đổi lại hàm đó nằm trên **instance**, không nằm trên prototype — và như mục
  9.1 sẽ thấy, method decorator của Nest không dán được lên loại đó.

---

## 7. Property descriptor — bản mô tả của một property

Mỗi dòng trong bảng object không chỉ có value. Nó có một **bản mô tả** gồm value và ba cờ:

```js
class A {
  hello() {}
}

Object.getOwnPropertyDescriptor(A.prototype, "hello");
// { value: [Function: hello], writable: true, enumerable: false, configurable: true }
```

| Trường         | Nghĩa                                          |
| -------------- | ---------------------------------------------- |
| `value`        | **chính giá trị** — ở đây là bản thân hàm      |
| `writable`     | gán lại được không                             |
| `enumerable`   | có hiện trong `Object.keys` / `for...in` không |
| `configurable` | xoá / đổi mô tả được không                     |

Hai điều cần nhớ:

1. `descriptor.value === A.prototype.hello` — descriptor **không phải bản sao**, `value` là đúng hàm đó.
2. Property chưa tồn tại thì `getOwnPropertyDescriptor` trả `undefined`. Không có gì thì không có bản mô tả.

Điều 2 nghe hiển nhiên, nhưng chính là lời giải cho câu hỏi "vì sao property decorator không có tham số thứ ba"
([mục 10.3](#103-vì-sao-property-decorator-không-có-descriptor)).

---

## 8. `extends` chỉ là nối thêm một mắt vào chain

```js
class Base {
  ping() {
    return "pong";
  }
}
class Child extends Base {
  hello() {}
}

Object.getPrototypeOf(Child.prototype) === Base.prototype; // true ← chain của instance
Object.getPrototypeOf(Child) === Base; // true ← chain của chính class (để static kế thừa)
new Child().ping(); // "pong" ← tìm ở Child.prototype không có, đi lên Base.prototype
```

```
 new Child() ─▶ Child.prototype ─▶ Base.prototype ─▶ Object.prototype ─▶ null
                  { hello }           { ping }
```

`extends` tạo **hai** chain song song: một cho instance (qua `prototype`), một cho class (để `static` kế thừa). Hễ
có chuỗi là có "đi ngược lên tìm" — và `Reflect.getMetadata` cũng đi ngược đúng chuỗi này ([mục 10.5](#105-vì-sao-metadata-kế-thừa-được)).

Trong dự án này chưa có controller nào `extends` controller khác, nhưng DTO thì có —
`RolePaginationQueryDto extends PaginationQueryDto`
([role.dto.ts:17](../../src/dtos/role/role.dto.ts#L17)), và nhờ chain đó mà DTO con thừa hưởng luôn các rule validation
của `page` / `limit` khai báo ở cha.

---

## 9. Boxing: primitive không phải object, nhưng vẫn `.length` được

Có bảy kiểu **primitive** — `string`, `number`, `boolean`, `bigint`, `symbol`, `undefined`, `null`. Chúng **không phải
object**: không có bảng key → value, không có liên kết `[[Prototype]]`. Vậy tại sao dòng này chạy?

```js
"abc".length; // 3
"abc".toUpperCase(); // "ABC"
```

`"abc"` không có bảng nào để tra `length`. Cái đang xảy ra gọi là **boxing** (đóng hộp):

> Khi bạn dùng `.` lên một primitive, JavaScript **tạm tạo một object bao** (`new String("abc")`) quanh nó, tra
> property trên object đó — theo prototype chain bình thường — rồi **vứt object bao đi**.

```
"abc".toUpperCase()
   │
   ├─ 1. tạo hộp:   box = new String("abc")        (tạm, vô hình)
   ├─ 2. tra:       box.toUpperCase  → không có trên box → lên String.prototype → thấy
   ├─ 3. gọi:       String.prototype.toUpperCase với this = box
   └─ 4. vứt hộp:   box biến mất; kết quả "ABC" giữ lại
```

Nên "method của string" thực ra **nằm trên `String.prototype`** — đúng cái tủ dùng chung ở [mục 3](#3-prototype-và-__proto__-là-hai-thứ-khác-nhau), chỉ khác là chủ tủ
là hàm dựng sẵn `String`:

```js
Object.getPrototypeOf("abc") === String.prototype; // true — hộp được tra ở đúng tủ này
String.prototype.shout = function () {
  return this.toUpperCase() + "!";
};
"hi".shout(); // "HI!" — thêm vào tủ là mọi string đều có
```

### 9.1 Ba hệ quả nhìn thấy được

**1. Gán property lên primitive là mất.** Hộp bị vứt sau mỗi phép `.`, nên thứ bạn gán nằm trên một hộp đã chết:

```js
const s = "abc";
s.foo = 1; // sloppy mode: im lặng; strict mode (mọi ES module, mọi body class): TypeError
s.foo; // undefined — hộp lúc gán và hộp lúc đọc là hai hộp khác nhau
```

**2. Hộp thật và primitive không bằng nhau.** `new String("a")` là object thật, sống lâu, `typeof` ra `"object"`:

```js
typeof "a"; // "string"
typeof new String("a"); // "object"
new String("a") == "a"; // true  — == ép kiểu, mở hộp
new String("a") === "a"; // false — khác kiểu
Boolean(new Boolean(false)); // true  — object nào cũng truthy, kể cả hộp của false
```

Vì thế **đừng bao giờ** viết `new String(...)` / `new Number(...)` / `new Boolean(...)` trong code thật. Chúng chỉ
tồn tại để engine có chỗ treo `String.prototype`.

**3. `null` và `undefined` không có hộp.** Hai kiểu này không có constructor bao, nên `.` lên chúng ném lỗi thay vì
tra được gì:

```js
null.length; // TypeError: Cannot read properties of null (reading 'length')
```

Đây là nguồn của phần lớn `TypeError` bạn thấy trong log: một biến đáng ra là string/object nhưng đang là
`null`/`undefined`, và không có hộp nào để cứu.

### 9.2 `5.toFixed()` là lỗi cú pháp, `(5).toFixed()` thì không

Boxing áp dụng cho số y như chuỗi, nhưng có bẫy parser: `5.` được đọc là số thập phân `5.0`, nên `5.toFixed` là lỗi.
Bọc ngoặc hoặc dùng hai dấu chấm:

```js
(5).toFixed(2); // "5.00"
(5).toFixed(1); // "5.0"  — dấu chấm đầu thuộc số, dấu chấm sau là truy cập property
```

### 9.3 Boxing và `this`: sloppy khác strict

[Mục 6](#6-this-được-quyết-định-lúc-gọi-không-phải-lúc-viết) nói `this` là "object đứng trước dấu chấm". Khi thứ đứng trước là primitive, `this` là gì? Tuỳ mode:

```js
function sloppy() {
  return typeof this;
}
function strict() {
  "use strict";
  return typeof this;
}
sloppy.call("x"); // "object" — this bị boxing thành new String("x")
strict.call("x"); // "string" — strict giữ nguyên primitive
```

Body của `class` luôn strict ([mục 5.3](#53-bản-chất-của-syntax-sugar-nhìn-code-sau-khi-biên-dịch)), ES module luôn strict, và `tsc` với `module: commonjs` chèn `"use strict"` vào đầu mỗi file
(dòng đầu của output ở mục 5.3). Nên **trong dự án bạn không gặp `this` bị boxing** — nhưng nếu bạn đọc code thư viện cũ
viết kiểu `String.prototype.foo = function () { this... }` không strict, `this` ở đó là hộp, không phải chuỗi.

### 9.4 `string` với `String` — và vì sao TypeScript phân biệt

TypeScript có hai kiểu tên gần nhau:

| Viết     | Là gì                                                               | Dùng khi                       |
| -------- | ------------------------------------------------------------------- | ------------------------------ |
| `string` | kiểu **primitive**                                                  | luôn luôn, trong annotation    |
| `String` | kiểu của **object hộp** (`new String()`), đồng thời là **hàm dựng** | không bao giờ trong annotation |

Annotation `name: String` không sai cú pháp nhưng sai nghĩa — nó cho phép nhận `new String("x")` và khiến so sánh
`===` ngầm hỏng. Lint của dự án chặn (`@typescript-eslint/no-wrapper-object-types`).

Nhưng có **một** chỗ `String` (viết hoa) xuất hiện hợp lệ, và nó dẫn thẳng về metadata: khi TypeScript dán kiểu của
field `name: string` vào bảng ẩn, nó **không thể** dán chữ `string` — kiểu bị xoá khi biên dịch, còn bảng ẩn cần một
**giá trị runtime**. Giá trị runtime duy nhất đại diện được cho "chuỗi" là hàm dựng `String`. Chi tiết ở [mục 10.8](#108-designtype-là-hàm-dựng-không-phải-tên-kiểu--hệ-quả-của-boxing).

---

## 10. Nối về decorator và metadata

Chín mục trên là JavaScript thuần. Giờ đọc lại [chương 1](01-decorators-and-metadata.md) với ba câu đã nắm:

- **`X.prototype` là cái tủ dùng chung của mọi instance `X`** ([mục 3](#3-prototype-và-__proto__-là-hai-thứ-khác-nhau)).
- **Method sống trên prototype ngay khi class được định nghĩa; field chỉ sống trên instance và chỉ khi `new` chạy**
  ([mục 5.1](#51-method-nằm-trên-prototype-field-nằm-trên-instance)).
- **Có chuỗi prototype thì có chuyện đi ngược lên tìm** ([mục 2](#2-tìm-không-thấy-thì-đi-hỏi-chỗ-khác-prototype-chain), [mục 8](#8-extends-chỉ-là-nối-thêm-một-mắt-vào-chain)).

### 10.1 Vì sao method decorator nhận `prototype`

Decorator chạy **lúc class được định nghĩa** — chưa có instance nào ([chương 1 §1](01-decorators-and-metadata.md#1-decorator-là-một-hàm-không-phải-cú-pháp-ma-thuật)). Vậy TypeScript muốn chỉ cho
decorator "method `hello` nằm chỗ này" thì chỉ có **một** địa chỉ tồn tại vào thời điểm đó: `Foo.prototype`. Chính
là chỗ method thật sự nằm ([mục 5.1](#51-method-nằm-trên-prototype-field-nằm-trên-instance)).

```ts
function MethodDec(target: object, key: string, desc: PropertyDescriptor) {
  target === Foo.prototype; // true
  desc.value === Foo.prototype.hello; // true
}

class Foo {
  @MethodDec hello() {}
}
```

Nên dòng `target = [object Foo.prototype]` ở bảng [chương 1 §2.2](01-decorators-and-metadata.md#22-bảng-tra) không phải quy ước lạ của TypeScript. Nó là **địa
chỉ thật, duy nhất khả dụng** của method vào lúc đó.

Đây cũng là lý do của lưu ý ở [mục 6](#6-this-được-quyết-định-lúc-gọi-không-phải-lúc-viết): method viết dạng `handler = () => {}` nằm trên instance, không nằm trên
prototype, nên **chưa tồn tại** khi decorator chạy — không dán decorator kiểu method lên nó được.

### 10.2 Vì sao metadata dùng chung cho mọi instance

[Chương 1 §6.10](01-decorators-and-metadata.md#610-hai-điều-nên-nhớ) nói "metadata gắn với hàm/class, không gắn với instance". [Mục 4](#4-new-làm-đúng-bốn-việc) và 5.1 giải thích tại sao: chỉ có
**một** `ManageProductController.prototype.getManageProducts` cho cả nghìn request. Nhãn dán lên hàm đó là nhãn cho
tất cả.

```ts
Reflect.defineMetadata(
  "required_permission",
  "product:read:own",
  ManageProductController.prototype.getManageProducts, // ← một hàm duy nhất
);
```

Vì vậy cấm lưu dữ liệu theo-request vào metadata: hai request đồng thời sẽ ghi đè lẫn nhau. Dữ liệu theo-request
thuộc về object `request` ([chương 3 §9](03-guards.md#9-truyền-dữ-liệu-từ-guard-xuống-handler)).

### 10.3 Vì sao property decorator không có descriptor

Nhìn lại bảng [chương 1 §2.2](01-decorators-and-metadata.md#22-bảng-tra): property decorator chỉ nhận `(target, key)`, tham số thứ ba là `undefined`.

Ghép [mục 5.1](#51-method-nằm-trên-prototype-field-nằm-trên-instance) với [mục 7](#7-property-descriptor--bản-mô-tả-của-một-property):

- Lúc decorator chạy, class mới vừa được định nghĩa → **field chưa tồn tại**, nó chỉ sinh ra khi `new` chạy.
- Property không tồn tại thì không có descriptor để trao.

```ts
class Dto {
  @PropDec name: string; // lúc PropDec chạy: Dto.prototype KHÔNG có "name"
}

Object.getOwnPropertyDescriptor(Dto.prototype, "name"); // undefined
```

Nên property decorator chỉ làm được đúng một việc: **ghi một nhãn vào cặp toạ độ `(prototype, tên field)`** để sau
này có người tra. Và đó chính xác là cách `class-validator` cùng `@nestjs/swagger` hoạt động —
[role.dto.ts:95-101](../../src/dtos/role/role.dto.ts#L95-L101):

```ts
export class CreateRoleRequestDto {
  @ApiProperty({ description: "Role name", example: "Admin" })
  @IsString()
  name: string;
}
```

Hai decorator, hai nhãn, cùng ghi vào `(CreateRoleRequestDto.prototype, "name")`. Không cái nào trong hai cái đó đọc được
giá trị của `name` — lúc chúng chạy chưa có instance nào. Chúng chỉ để lại chỉ dẫn; `ValidationPipe` mới là người
đọc, mỗi request ([chương 7](07-dto-validation-transformation-serialization.md)).

### 10.4 `descriptor.value` và `context.getHandler()` là cùng một hàm

[Mục 7](#7-property-descriptor--bản-mô-tả-của-một-property), điều 1: `descriptor.value` chính là hàm, không phải bản sao. Đó là mắt nối cả hệ thống lại:

```
lúc định nghĩa class          lúc có request
──────────────────────        ─────────────────────────────
SetMetadata dán nhãn lên      guard gọi context.getHandler()
descriptor.value        ═════════════════▶  trả về ĐÚNG hàm đó
                              → reflector đọc lại đúng nhãn
```

Nếu `descriptor.value` là bản sao thì nhãn dán lúc khởi động sẽ nằm trên một hàm khác với hàm guard nhận được lúc
chạy, và cả cơ chế phân quyền sụp. Nó hoạt động được chỉ vì JavaScript truyền **chính hàm** đó — một object, một
tham chiếu, từ đầu đến cuối.

Kiểm chứng trong 4 dòng:

```ts
const handler = ManageProductController.prototype.getManageProducts;
Reflect.getMetadata("required_permission", handler); // "product:read:own"
// và trong guard, context.getHandler() === handler
```

### 10.5 Vì sao metadata kế thừa được

`Reflect.getMetadata` không chỉ tra ở target. Không thấy, nó **đi ngược prototype chain** — đúng cái chain ở [mục 8](#8-extends-chỉ-là-nối-thêm-một-mắt-vào-chain) —
rồi tra tiếp. `getOwnMetadata` thì không đi.

```ts
@SetMetadata("tag", "từ cha")
class BaseController {}
class ChildController extends BaseController {}

Reflect.getMetadata("tag", ChildController); // "từ cha"    ← đi lên theo chain
Reflect.getOwnMetadata("tag", ChildController); // undefined   ← chỉ nhìn chính nó
```

Nên "decorator trên class cha được class con thừa hưởng" ([chương 1 §11](01-decorators-and-metadata.md#11-nâng-cao-những-chỗ-dễ-vấp)) không phải tính năng riêng của
`reflect-metadata`. Nó là **prototype chain**, lần thứ ba.

### 10.6 Script quét route của dự án đi đúng trên prototype

Chỗ nhìn thấy prototype rõ nhất trong code thật của dự án là hàm kiểm tra lúc khởi động — nó phải tìm mọi handler
của mọi controller để chắc chắn không route nào thiếu `@RequirePermission`
([collect-route-permissions.util.ts:48-67](../../src/shared/utils/collect-route-permissions.util.ts#L48-L67) —
đã gộp hai khối `if` xuống một dòng cho gọn, logic y nguyên):

```ts
const prototype = controllerClass.prototype as Record<string, unknown>;

for (const methodName of metadataScanner.getAllMethodNames(prototype)) {
  const handler = prototype[methodName];

  if (typeof handler !== "function") continue;
  if (Reflect.getMetadata(PATH_METADATA, handler) === undefined) continue;

  const key = reflector.getAllAndOverride<PermissionKey | undefined>(
    PERMISSION_KEY,
    [handler, controllerClass],
  );
}
```

Đọc lại bằng chương này, không còn chỗ nào bí ẩn:

| Dòng                                      | Là gì theo chương này                                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `controllerClass.prototype`               | cái tủ dùng chung — **chỗ method thật sự nằm** ([mục 3](#3-prototype-và-__proto__-là-hai-thứ-khác-nhau), 5.1)                         |
| `getAllMethodNames(prototype)`            | liệt kê method; phải dùng hàm của Nest vì `Object.keys` không thấy ([mục 5.2](#52-vì-sao-objectkeysprototype-ra-rỗng))                |
| `prototype[methodName]`                   | lấy **chính hàm handler**, cùng object guard sẽ nhận lúc chạy ([mục 10.4](#104-descriptorvalue-và-contextgethandler-là-cùng-một-hàm)) |
| `Reflect.getMetadata(PATH_METADATA, ...)` | nhãn `@Get()` đã dán lên hàm đó lúc import file                                                                                       |
| `[handler, controllerClass]`              | tra method trước, không có thì tra class — đúng thứ tự "dưới lên" ([mục 2](#2-tìm-không-thấy-thì-đi-hỏi-chỗ-khác-prototype-chain))    |

Và `AccessTokenGuard` lúc có request làm y hệt một bước cuối cùng đó
([access-token.guard.ts:77-79](../../src/shared/guards/access-token.guard.ts#L77-L79)):

```ts
const required = this.reflector.getAllAndOverride<PermissionKey | undefined>(
  PERMISSION_KEY,
  [context.getHandler(), context.getClass()],
);
```

Một bên quét cả app lúc khởi động, một bên tra một hàm lúc có request — nhưng cùng đọc một bảng, trên cùng những
object đó.

### 10.7 Vì sao DI đọc được kiểu tham số constructor

Bảng [chương 1 §2.2](01-decorators-and-metadata.md#22-bảng-tra) có một dòng lệch: decorator trên **tham số constructor** nhận `target` là constructor, `key` là
`undefined`. [Mục 3](#3-prototype-và-__proto__-là-hai-thứ-khác-nhau) giải thích: constructor **là** chính hàm class, nó không phải một entry trên prototype nên không
có tên property để đưa vào `key`.

Vì vậy metadata về constructor được dán lên chính class:

```ts
Reflect.getMetadata("design:paramtypes", ManageProductController);
// [ [Function: ManageProductService] ]
```

Đó là cách Nest biết `constructor(private readonly manageProductService: ManageProductService)` cần nhận cái gì —
nó đọc mảng kiểu này rồi tìm provider tương ứng ([chương 6](06-modules-and-dependency-injection.md)).

### 10.8 `design:type` là hàm dựng, không phải tên kiểu — hệ quả của boxing

[Chương 1 §6.8](01-decorators-and-metadata.md#68-xem-metadata-thật-trong-dự-án) in ra `design:type của 'name' = [class String]`. Ghép [mục 9.4](#94-string-với-string--và-vì-sao-typescript-phân-biệt) với [mục 5.3](#53-bản-chất-của-syntax-sugar-nhìn-code-sau-khi-biên-dịch) là hiểu vì sao lại là
`String` viết hoa:

- Kiểu `string` bị xoá lúc biên dịch ([mục 5.3](#53-bản-chất-của-syntax-sugar-nhìn-code-sau-khi-biên-dịch), điều 1). Không còn gì để dán.
- Bảng ẩn của `reflect-metadata` chỉ nhận **giá trị JavaScript**. Thứ duy nhất vừa tồn tại ở runtime vừa "có nghĩa là
  chuỗi" là hàm dựng `String` — cái hàm mà [mục 9](#9-boxing-primitive-không-phải-object-nhưng-vẫn-length-được) gọi là chủ của tủ `String.prototype`.
- Nên `tsc` nhả ra `__metadata("design:type", String)`, và `class-validator` khi cần biết field là chuỗi thì so
  `=== String`.

Cùng logic cho toàn bảng — mỗi kiểu TypeScript được **ánh xạ về hàm dựng gần nhất**, và thứ gì không có hàm dựng thì
gộp về `Object`:

| Annotation                 | `design:type` | Vì sao                                                        |
| -------------------------- | ------------- | ------------------------------------------------------------- |
| `string` / `"a" \| "b"`    | `String`      | hàm dựng của hộp                                              |
| `number` / enum số         | `Number`      | như trên                                                      |
| `boolean`                  | `Boolean`     | như trên                                                      |
| `string[]`                 | `Array`       | mất tham số phần tử — Nest/validator không biết là `string[]` |
| `Date`, `Dto` (class)      | chính class   | class là hàm dựng, dùng được ngay                             |
| `string \| null` (strict)  | `Object`      | không có hàm dựng nào bao được cả hai                         |
| `string \| number`         | `Object`      | như trên                                                      |
| `interface Addr`           | `Object`      | interface không tồn tại ở runtime                             |
| `any`                      | `Object`      | không biết gì                                                 |
| `Promise<number>` (return) | `Promise`     | mất tham số bên trong                                         |

Hai dòng cuối bảng là lý do của hai quy tắc trong dự án mà [chương 6](06-modules-and-dependency-injection.md) và 7 sẽ nói kỹ: **không inject qua interface**
(DI chỉ nhận được `Object`, không biết tìm provider nào) và **`@IsArray()` phải kèm `{ each: true }`** (validator
chỉ thấy `Array`, không thấy phần tử là gì).

Toàn bộ cơ chế ghi/đọc của bảng ẩn — nó là `WeakMap` gì, key `undefined` nghĩa là gì, `getMetadata` đi ngược chain
thế nào — nằm ở [phụ lục A](appendix-a-reflect-metadata-internals.md).

---

## 11. Bảng thuật ngữ

| Từ                                | Nghĩa gọn                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| **prototype (của object)**        | object mà nó đi hỏi khi tra key không thấy                                             |
| **`X.prototype`**                 | cái tủ dùng chung `X` phát cho mọi instance của `X` — **không** phải prototype của `X` |
| **`[[Prototype]]` / `__proto__`** | tên của liên kết ẩn nói trên                                                           |
| **prototype chain**               | chuỗi liên kết đó, kết thúc ở `null`                                                   |
| **instance**                      | object do `new X()` sinh ra                                                            |
| **field / property**              | dòng dữ liệu; field khai trong class sinh ra trên instance                             |
| **method**                        | property có value là hàm; method của class nằm trên `X.prototype`                      |
| **descriptor**                    | bản mô tả một property: `value` + `writable` / `enumerable` / `configurable`           |
| **`this`**                        | object đứng trước dấu chấm **lúc gọi**; không cố định theo nơi viết                    |
| **own property**                  | property nằm ngay trên object đó, không phải thừa hưởng từ chain                       |

---

## 12. Sáu nhầm lẫn phổ biến

| Nhầm                                                   | Thực tế                                                                                                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "`Foo.prototype` là prototype của `Foo`"               | Không. Nó là prototype của **instance** `Foo`. Prototype của `Foo` là `Function.prototype`.                                                                                                 |
| "`class` là mô hình OOP mới, khác prototype"           | Không. `class` là cú pháp gọn cho constructor + prototype. `typeof class` vẫn là `"function"`.                                                                                              |
| "Kế thừa là copy method từ cha xuống con"              | Không copy gì. Chỉ nối thêm một mắt vào chain; sửa method ở cha là con thấy ngay.                                                                                                           |
| "Method dán decorator được thì field cũng vậy"         | Khác nhau. Method có trên prototype lúc class định nghĩa; field thì chưa tồn tại → không có descriptor.                                                                                     |
| "Đặt mảng/object lên prototype cho tiết kiệm"          | Tiết kiệm thật, nhưng mọi instance sửa chung một mảng ([mục 4.1](#41-cái-gì-riêng-thì-khởi-tạo-trong-constructor-cái-gì-chung-mới-lên-prototype)). Chỉ hàm mới nên nằm trên prototype.      |
| "`{}` và `[]` không dùng `new` nên không có prototype" | Có. `{}` đi lên `Object.prototype`, `[]` đi lên `Array.prototype`; `.map`, `.toString` đến từ đó ([mục 3.1](#31-fooprototype-sinh-ra-cùng-lúc-với-hàm-và-built-in-cũng-theo-đúng-luật-đó)). |

---

## 13. Tự kiểm chứng

Chạy nguyên file này (lưu `proto-demo.mjs`, gọi `node proto-demo.mjs`). Đoán output trước khi chạy — chỗ nào đoán sai
là chỗ cần đọc lại.

```js
// ── 1. chain dựng tay ─────────────────────────────────────────
const animal = { legs: 4 };
const dog = Object.create(animal);
dog.name = "Mực";
console.log("dog.legs =", dog.legs); // 4, thừa hưởng
console.log("own của dog:", Object.keys(dog)); // ["name"] — legs không nằm trên dog
dog.legs = 3; // GHI luôn ghi vào chính dog
console.log("animal.legs sau khi ghi =", animal.legs); // 4, cha không đổi

// ── 2. prototype vs __proto__ ─────────────────────────────────
class User {
  name = "chưa đặt";
  greet() {
    return `hi ${this.name}`;
  }
}
const u = new User();
console.log(
  "proto của instance là User.prototype?",
  Object.getPrototypeOf(u) === User.prototype, // true
  "| proto của class là Function.prototype?",
  Object.getPrototypeOf(User) === Function.prototype, // true
);

// ── 3. method ở prototype, field ở instance ───────────────────
console.log("trên prototype:", Object.getOwnPropertyNames(User.prototype)); // ["constructor","greet"]
console.log("trên instance :", Object.getOwnPropertyNames(u)); // ["name"]
console.log("dùng chung một hàm?", new User().greet === User.prototype.greet); // true
console.log("Object.keys(prototype):", Object.keys(User.prototype)); // [] — enumerable:false

// ── 4. descriptor ─────────────────────────────────────────────
const d = Object.getOwnPropertyDescriptor(User.prototype, "greet");
console.log("descriptor.value là chính hàm?", d.value === User.prototype.greet); // true
console.log(
  "descriptor của field 'name':",
  Object.getOwnPropertyDescriptor(User.prototype, "name"),
); // undefined

// ── 5. this quyết định lúc gọi ────────────────────────────────
const g = u.greet;
try {
  g();
} catch (e) {
  console.log("tách hàm ra thì mất this:", e.constructor.name);
}
console.log("gán this thủ công:", g.call({ name: "X" })); // "hi X"

// ── 6. extends nối thêm một mắt ───────────────────────────────
class Admin extends User {}
console.log(
  "chain instance:",
  Object.getPrototypeOf(Admin.prototype) === User.prototype, // true
  "| chain class:",
  Object.getPrototypeOf(Admin) === User, // true
);
console.log("Admin thừa hưởng greet:", new Admin().greet()); // "hi chưa đặt"

// ── 7. class là sugar: các luật chặt hơn ──────────────────────
try {
  User();
} catch (e) {
  console.log("gọi class không new:", e.message); // Class constructor User cannot be invoked without 'new'
}
try {
  new Late();
} catch (e) {
  console.log("class không hoisting:", e.constructor.name); // ReferenceError
}
class Late {}
console.log(
  "User.prototype.constructor === User?",
  User.prototype.constructor === User,
); // true

// ── 8. boxing ─────────────────────────────────────────────────
console.log(
  "typeof 'abc':",
  typeof "abc",
  "| typeof new String('abc'):",
  typeof new String("abc"),
); // string | object
console.log(
  "proto của 'abc' là String.prototype?",
  Object.getPrototypeOf("abc") === String.prototype,
); // true
String.prototype.shout = function () {
  return this.toUpperCase() + "!";
};
console.log("'hi'.shout():", "hi".shout()); // "HI!"
try {
  const s = "abc";
  s.foo = 1; // file .mjs là strict → ném lỗi; đổi sang .cjs thì im lặng và s.foo là undefined
} catch (e) {
  console.log("gán property lên primitive (strict):", e.constructor.name); // TypeError
}
console.log(
  "new String('a') == 'a':",
  new String("a") == "a",
  "| ===:",
  new String("a") === "a",
); // true | false
console.log("(5).toFixed(2):", (5).toFixed(2)); // "5.00"
try {
  null.length;
} catch (e) {
  console.log("null không có hộp:", e.constructor.name); // TypeError
}

// ── 9. Foo.prototype ban đầu chỉ có constructor; built-in cùng luật ─
function Person(first) {
  this.first = first;
}
console.log(
  "prototype mới sinh:",
  Object.getOwnPropertyNames(Person.prototype),
); // ["constructor"]
console.log(
  "[] đi lên Array.prototype?",
  Object.getPrototypeOf([]) === Array.prototype,
); // true
console.log("đỉnh chuỗi:", Object.getPrototypeOf(Object.prototype)); // null

// ── 10. dữ liệu sửa được để trên prototype là dùng chung ───────────
Person.prototype.friends = [];
const a = new Person("A");
const b = new Person("B");
a.friends.push("x");
console.log("b.friends bị ảnh hưởng?", b.friends.length); // 1 — cùng một mảng
console.log("Object.keys(a):", Object.keys(a)); // ["first"] — friends không nằm trên a
```

Riêng thí nghiệm `this` bị boxing cần **sloppy mode**, mà `.mjs` luôn strict — lưu đoạn này thành `.cjs`:

```js
// boxing-this.cjs — chạy: node boxing-this.cjs
function sloppy() {
  return typeof this;
}
function strict() {
  "use strict";
  return typeof this;
}
console.log(sloppy.call("x"), strict.call("x")); // object string
```

Bản TypeScript nối sang metadata (lưu `meta-demo.ts`, gọi `npx ts-node meta-demo.ts` — cần
`experimentalDecorators` và `emitDecoratorMetadata` trong `tsconfig.json`):

```ts
import "reflect-metadata";

function Tag(value: string) {
  return (target: object, key: string, desc: PropertyDescriptor) => {
    console.log(
      "decorator chạy | target là prototype?",
      target === Foo.prototype,
    );
    console.log(
      "descriptor.value là chính hàm?",
      desc.value === Foo.prototype[key],
    );
    Reflect.defineMetadata("tag", value, desc.value); // dán lên CHÍNH HÀM
  };
}

class Foo {
  @Tag("xin chào") hello() {}
}
console.log("— hết phần định nghĩa class —");

// đọc lại đúng cái nhãn đó, từ chính hàm đó
const handler = Foo.prototype.hello;
console.log("đọc nhãn từ hàm:", Reflect.getMetadata("tag", handler)); // "xin chào"

// metadata cũng đi ngược chain, giống mọi phép tra property
@Reflect.metadata("owner", "cha")
class Base {}
class Child extends Base {}
console.log("getMetadata (đi lên):", Reflect.getMetadata("owner", Child)); // "cha"
console.log(
  "getOwnMetadata (không đi):",
  Reflect.getOwnMetadata("owner", Child),
); // undefined

// design:type là HÀM DỰNG, không phải tên kiểu (mục 10.8)
const P = (): PropertyDecorator => () => {};
interface Addr {
  city: string;
}
class Dto {
  @P() s!: string;
  @P() arr!: string[];
  @P() nul!: string | null;
  @P() iface!: Addr;
}
for (const k of ["s", "arr", "nul", "iface"]) {
  console.log(
    k,
    "→",
    Reflect.getMetadata("design:type", Dto.prototype, k).name,
  );
}
// s → String | arr → Array | nul → Object | iface → Object
```

---

**Xong chương 0.** Sang [chương 1 — Decorator và metadata](01-decorators-and-metadata.md). Mỗi chỗ chương 1 viết
`X.prototype`, bạn đã biết đó là cái tủ dùng chung của mọi instance, và đó là **địa chỉ duy nhất** decorator có thể
nhận vào thời điểm nó chạy. Muốn biết cái "bảng ẩn" chứa metadata thật ra là cấu trúc gì, đọc tiếp
[phụ lục A — `reflect-metadata` bên trong](appendix-a-reflect-metadata-internals.md).

**Đọc thêm.** [Mục 3.1](#31-fooprototype-sinh-ra-cùng-lúc-với-hàm-và-built-in-cũng-theo-đúng-luật-đó) và 4.1 lấy ví dụ `Person` / `friends` từ bài
[Prototype trong JavaScript](https://viblo.asia/p/prototype-trong-javascript-RQqKLzOrl7z) (Đinh Văn Cảnh, Viblo, 2018) —
ngắn, viết theo lối function-style trước khi có `class`, đọc để thấy cùng cơ chế dưới một cách viết khác.
