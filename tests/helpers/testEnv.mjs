// ============================================================
// tests/helpers/testEnv.mjs
// ------------------------------------------------------------
// Stub mínimo de navegador para permitir importar módulos do app em Node
// (via `node --test`) sem depender de jsdom ou de um navegador real.
//
// Por que não jsdom: o projeto não tem build step e evita dependências
// desnecessárias (ver docs/FRONTEND_AUDIT.md e a regra do prompt de
// refatoração "não adicione dependências sem necessidade"). O app só
// precisa de umas poucas APIs de DOM para poder ser importado sem lançar
// (getElementById, classList, addEventListener) — não precisa de um DOM
// completo, já que os testes aqui focam em regras de negócio puras
// (permissões, repositórios, serviços), não em renderização.
//
// IMPORTANTE: chame installBrowserStubs() ANTES de importar qualquer
// módulo de assets/js/ (use `await import(...)` dinâmico depois de chamar
// esta função — um `import` estático no topo do arquivo seria avaliado
// antes dos stubs existirem).
// ============================================================

function makeStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

class FakeClassList {
  constructor() {
    this._set = new Set();
  }
  add(...classes) {
    classes.forEach((c) => this._set.add(c));
  }
  remove(...classes) {
    classes.forEach((c) => this._set.delete(c));
  }
  toggle(c, force) {
    const shouldHave = force === undefined ? !this._set.has(c) : force;
    if (shouldHave) this._set.add(c);
    else this._set.delete(c);
    return shouldHave;
  }
  contains(c) {
    return this._set.has(c);
  }
}

class FakeElement {
  constructor() {
    this.value = "";
    this.textContent = "";
    this.innerHTML = "";
    this.style = {};
    this.dataset = {};
    this.classList = new FakeClassList();
    this._listeners = {};
  }
  addEventListener(type, fn) {
    (this._listeners[type] ||= []).push(fn);
  }
  removeEventListener() {}
  dispatchEvent(evt) {
    (this._listeners[evt.type] || []).forEach((fn) => fn(evt));
    return true;
  }
  setAttribute(k, v) {
    this[k] = v;
  }
  appendChild(child) {
    return child;
  }
  prepend() {}
  remove() {}
  querySelectorAll() {
    return [];
  }
  querySelector() {
    return new FakeElement();
  }
}

export function installBrowserStubs() {
  const elementRegistry = new Map();
  globalThis.localStorage = makeStorage();
  globalThis.sessionStorage = makeStorage();
  globalThis.document = {
    getElementById(id) {
      if (!elementRegistry.has(id)) elementRegistry.set(id, new FakeElement());
      return elementRegistry.get(id);
    },
    querySelector() {
      return new FakeElement();
    },
    querySelectorAll() {
      return [];
    },
    createElement() {
      return new FakeElement();
    },
    addEventListener() {},
    body: new FakeElement(),
  };
  globalThis.window = {
    innerWidth: 1200,
    addEventListener() {},
    location: { protocol: "http:" },
  };
}
