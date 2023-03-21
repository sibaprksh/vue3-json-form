import data from './schema.json';
console.log({ data });

const _qus = new URLSearchParams(location.search);
const params = {
  model: _qus.get('model') == 'true',
  schema: _qus.get('schema') == 'true',
  debug: _qus.get('debug') == 'true',
  dev: _qus.get('dev') == 'true',
  debugVue: _qus.get('debug-vue') == 'true',
  console: _qus.get('console') == 'true',
};

/**
 * generic vue lib code
 *  */
console.timeEnd('loading-js files');
var { Util, COMPONENTS, INPUT_MIXIN, SCOPED_CSS } = (function (
  showLog = false
) {
  const set = (obj, path, value) => {
    if (Object(obj) !== obj) return obj;
    if (!Array.isArray(path)) path = path.toString().match(/[^.[\]]+/g) || [];
    path
      .slice(0, -1)
      .reduce(
        (a, c, i) =>
          Object(a[c]) === a[c]
            ? a[c]
            : (a[c] = Math.abs(path[i + 1]) >> 0 === +path[i + 1] ? [] : {}),
        obj
      )[path[path.length - 1]] = value;
    return obj;
  };
  const get = (obj, path, defaultValue = undefined) => {
    const travel = (regexp) =>
      String.prototype.split
        .call(path, regexp)
        .filter(Boolean)
        .reduce(
          (res, key) => (res !== null && res !== undefined ? res[key] : res),
          obj
        );
    const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
    return result === undefined || result === obj ? defaultValue : result;
  };
  const isEmpty = (obj) =>
    [Object, Array].includes((obj || {}).constructor) &&
    !Object.entries(obj || {}).length;
  const invoke = (obj, path, ...args) => {
    const fn = get(obj, path);
    if (fn) {
      return fn.apply(obj, args);
    }
  };

  const omit = (obj, keys) =>
    Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));

  const debounce = (fn, delay) => {
    let timeout,
      thiz = this;
    return (...args) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  };

  const _Util = { set, get, isEmpty, invoke, omit, debounce };

  const interpolate = (str, context = {}, options = {}) => {
    const { prefix = '{{', suffix = '}}' } = options;

    const keys = Object.keys(context).join();
    const values = Object.values(context);

    const replacer = (token) => {
      const fn = new Function(keys, 'return ' + token.trim());
      return fn.apply(null, values);
    };

    if (str.indexOf(prefix) != -1 && str.indexOf(suffix) != -1) {
      const re = new RegExp(prefix + '(.*?)' + suffix, 'g');
      return str.replace(re, (_, token) => replacer(token));
    } else {
      return replacer(str);
    }
  };

  const isVisible = (el) =>
    el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  const evalInContext = (expression, context = {}) => {
    expression = expression.toString();

    if (['model', '{{'].some((str) => expression.includes(str))) {
      return interpolate(expression, context);
    } else {
      return expression; // Static string
    }
  };
  const execute = ({ context, obj, schema, model = {}, form = {} }) => {
    const _model = JSON.parse(JSON.stringify(model));
    if (typeof obj === 'string') {
      //return evalInContext(obj, { model: _model });
      return evalInContext(obj, { ...form });
    } else if (typeof obj === 'object' && obj.fn) {
      const eFnName = Util.get(obj, 'fn', obj);
      const eOption = Util.get(obj, 'options', {});

      const rawSchema = Util.get(obj, 'options.rawSchema', false);
      const rawModel = Util.get(obj, 'options.rawModel', false);

      const fn = typeof eFnName == 'function' ? eFnName : window[eFnName];
      if (fn) {
        const _schema = JSON.parse(JSON.stringify(schema));
        const retVal = fn.call(context, {
          schema: rawSchema ? schema : _schema,
          model: rawModel ? model : _model,
          options: eOption,
          value: _schema.key ? Util.get(_model, [_schema.key], '') : undefined,
        });
        return retVal;
      }
    }
  };

  const isNativeCustomElement = (el) =>
    el && el.tagName && !!customElements.get(el.tagName.toLocaleLowerCase());

  _Util.evalInContext = evalInContext;
  _Util.debounce = debounce;
  _Util.isVisible = isVisible;

  /* Above codes are generic but below codes are dependent on Vue.js */

  const _INPUT_MIXIN = {
    props: {
      schema: Object,
      options: Object,
      model: {
        type: String,
        default: '', //change to watch
      },
      form: Object,
    },
    methods: {
      updateModel(value) {
        this.$emit('updateModel', value);
      },
      checkValidation() {
        const validation = Util.get(this, 'schema.validation');

        const schemaMessages = Util.get(validation, 'messages', []);
        const globalMessages = Util.get(
          this,
          'options.validation.messages',
          []
        );

        const vMessages = [...schemaMessages, ...globalMessages];
        if (vMessages.length == 0) return;

        const el = Util.get(this, '$refs.input');
        if (!el) return;

        // clear validation
        el.setCustomValidity('');
        this.validationMessage = '';

        const validators = Util.get(validation, 'validators');

        const validationMessagesMaping = Object.assign(
          {},
          {
            patternMismatch: 'pattern',
            valueMissing: 'required',
          },
          Util.get(this, 'options.validation.mappings')
        );

        for (let { name: mKey, msg: val } of vMessages) {
          const _key = mKey.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          const _key2 = Object.keys(validationMessagesMaping).find(
            (key) => validationMessagesMaping[key] === _key
          );

          const schemaReadonly = JSON.parse(JSON.stringify(this.schema));
          const modelReadonly = JSON.parse(
            JSON.stringify(this.form.model || {})
          );

          //const _val = evalInContext(val, { model: modelReadonly });
          const _val = evalInContext(val, { ...this.form });

          // Native validator (e.g required)
          if (el.validity[_key] || el.validity[_key2]) {
            this.validationMessage = _val;
            break;
          } else {
            // Custom validators
            if (!validators) continue;

            const validator = validators[mKey];
            if (!validator) continue;

            const ret = execute({
              context: el,
              obj: validator,
              schema: this.schema,
              model: modelReadonly,
              form: this.form,
            });
            if (ret == false) {
              el.setCustomValidity(_val);
              this.validationMessage = _val;
              break;
            }
          }
        }

        const valid = this.validationMessage ? false : true;
        //this.dispatchEvent(new CustomEvent('update-validity', { bubbles: true, composed: true, detail: { valid } }));
        this.$emit('updateValidity', { valid, target: this.getElReference() });
      },
      getElReference() {
        let el = Util.get(this, '$refs.input');
        return el;
      },
    },
    emits: ['updateModel', 'updateValidity', 'set'],
    computed: {
      atts() {
        return this.schema.atts || {};
      },
      templateOptions() {
        return this.schema.templateOptions || {};
      },
    },
    created() {
      showLog && console.log('created', this.props);
      this.$watch(
        'model',
        debounce((newVal, oldVal) => {
          if (newVal != oldVal) {
            this.$emit('updateModel', newVal);

            const el = Util.get(this, '$refs.input');
            if (el) {
              el.oldVal = oldVal;
            }
            const event = new CustomEvent('set', { detail: { target: el } });
            Object.defineProperty(event, 'target', {
              writable: false,
              value: el,
            });
            this.$emit('set', event);
          }
        }, 100),
        { immediate: true }
      );
    },
    data() {
      return { validationMessage: '' };
    },
    setup({ schema, model }) {
      showLog && console.log('setup-input', props);

      // if(schema.templateOptions.subType == 'currency') {
      //     if(model && model.includes('.')) {
      //         model = model.slice(0, -3);
      //     }
      // }
    },
  };

  const _RENDER_CONTROL = {
    props: {
      schema: {
        type: Object,
        validator: function (value) {
          const is = _.isPlainObject(value) && value.hasOwnProperty('type');
          return is ? true : console.error('Invalid prop', value);
        },
      },
      model: {
        type: [String, Object],
        //default: () => '' //change to watch
      },
      form: {
        type: Object,
        default: () => ({}),
      },
    },
    setup({ schema, model, form }, { emit }) {
      if (!_.isPlainObject(schema))
        return console.error('schema must be a json', schema);
      if (!schema['type'])
        return console.error('must have property: type', schema);
    },
    emits: ['updateModel'],
    mounted() {
      const init = () => {
        this.handleValidation();
        this.handleExpression();
      };
      addEventListener(
        'refresh-control',
        debounce((e) => {
          showLog && console.log('refresh-control', e.detail.source == this);
          init();
        }),
        500
      );
      init();

      this.$nextTick(
        debounce(() => {
          this.handleEvent('mounted', this);
        })
      );
    },
    watch: {
      reference: {
        handler(newVal, oldVal) {
          this.handleValidation();
          this.handleExpression();
        },
      },
      cmodel: {
        handler(newVal, oldVal) {
          showLog &&
            console.log('render-control-cmodel', newVal, oldVal, this.cschema);
          this.$emit('updateModel', newVal);
          dispatchEvent(
            new CustomEvent('refresh-control', { detail: { source: this } })
          );
        },
        deep: true,
        immediate: true,
      },
      model: {
        handler(newVal, oldVal) {
          this.cmodel = newVal;
        },
        deep: true,
        immediate: true,
      },
      cschema: {
        handler(newVal, oldVal) {
          dispatchEvent(
            new CustomEvent('refresh-control', { detail: { source: this } })
          );
        },
        deep: true,
        immediate: true,
      },
      schema: {
        handler(newVal, oldVal) {
          this.cschema = newVal;
        },
        deep: true,
        immediate: true,
      },
    },
    data() {
      return {
        reference: undefined,
        cmodel: this.model,
        cschema: this.schema,
      };
    },
    updated: function () {
      this.$nextTick(
        debounce(() => {
          this.handleEvent('updated', this);
        })
      );
    },
    methods: {
      handleEvent(type, e) {
        let context = e;
        if (['updated', 'mounted'].includes(type)) {
          params.console &&
            console.log(
              '%cmounted-updated',
              'background: #222; color: #bada55'
            );
          params.console && console.log(type, e, e.getElReference());
          context = e.getElReference();
        }

        const { cschema } = this;
        let { events } = cschema;

        if (Util.isEmpty(events)) return;

        let _events = events
          .filter((ev) => ev.name == type)
          .map((ev) => ev.value);

        for (let event of _events) {
          let { delay } = event.options || {};

          let cb = () => {
            const retVal = execute({
              context,
              obj: event,
              schema: cschema,
              model: this.form.model,
              form: this.form,
            });
            if (retVal != undefined) {
              this.cmodel = retVal;
              Util.set(this, ['form', 'model', cschema.key], retVal);
            }
          };

          if (delay) {
            setTimeout(cb, delay);
          } else {
            cb();
          }
        }
      },
      handleExpression() {
        const { cschema: s } = this;
        const { expression = {} } = s;
        for (const [key, val] of Object.entries(expression)) {
          const el = this.getElReference();
          const ret = execute({
            context: el,
            obj: val,
            schema: s,
            model: this.form.model,
            form: this.form,
          });
          if (ret != undefined) {
            set(s, key, ret);
          }
        }
      },
      handleValidation() {
        Util.invoke(this.reference, 'checkValidation');
      },
      getTemplate() {
        const schema = this.cschema;
        if (!schema.template) return;
        return evalInContext(schema.template);
      },
      getElReference() {
        let el = Util.get(this, 'reference.$refs.input');
        if (!el) {
          el = Util.invoke(this.reference, 'getElReference');
        }
        return el;
      },
      setReference(el) {
        this.reference = el;

        if (isNativeCustomElement(el)) {
          // :schema.prop is not passing updated schema after chnage
          // This will force call setter of element
          el.schema = this.cschema;
        }
      },
      setModel($event) {
        // If $event is a native custom event, take from $event.detail.value
        this.cmodel = Util.get($event, 'detail.value', $event);
      },
      get(obj, path, defaultVal) {
        return Util.get(obj, path, defaultVal);
      },
      set(obj, path, val) {
        Util.set(obj, path, val);
      },
    },
    created() {
      const {
        cschema: { events },
      } = this;

      if (params.console && events && !Array.isArray(events)) {
        console.error('events must be an array', this.cschema);
      }

      const callback = (event) => {
        this.handleEvent(event.type, event);
      };

      const uiEvents = {};

      if (events) {
        for (let { name, value } of events) {
          if (!uiEvents[name]) {
            uiEvents[name] = typeof value == 'function' ? value : callback;
          } else {
            let _tmp = uiEvents[name];
            uiEvents[name] = function (...args) {
              _tmp.apply(this, args);
            };
          }
        }
      }
      this.uiEvents = uiEvents;
    },
    computed: {
      className: function () {
        const one = Util.get(this, 'cschema.templateOptions.wrapper')
          ? null
          : Util.get(this, 'cschema.templateOptions.wrapperClassName');
        const two = this.cschema.type;
        return [one, two].filter(Boolean).join(' ');
      },
      wrapperClassName: function () {
        const one = Util.get(this, 'cschema.templateOptions.wrapper')
          ? Util.get(this, 'cschema.templateOptions.wrapperClassName')
          : null;
        const two = Util.get(this, 'cschema.templateOptions.wrapper');
        return [one, two].filter(Boolean).join(' ');
      },
    },
    template: `
                            <!-- cschema: {{cschema}} -->
                            <component v-bind:is="get(cschema, 'templateOptions.wrapper', 'v-fragment')" :schema="cschema" :class="wrapperClassName">
                                <template v-if="cschema.type.includes('-')">                                    
                                    <component v-bind:is="cschema.type" :schema="cschema" :form="form"
                                        :class="className"
                                        :ref="setReference"
                                        v-if="!get(cschema, 'templateOptions.hide')"
                
                                        :schema.prop="cschema"
                                        :model.prop="cmodel"
                                        :form.prop="form"
                                        
                                        :model="cmodel"
                                        @updateModel="setModel"
                            
                                        @update="handleEvent('update', $event)"
                                        @set="handleEvent('set', $event)"
                                        @updateValidity="set(cschema, 'validation.$valid' , $event.valid)"

                                        v-on="uiEvents"
                                    ></component>                                    
                                </template>
                                <template v-else>                                    
                                    <v-switch :case="cschema.type">
                                        <template #static>
                                            <div v-if="!get(cschema, 'templateOptions.hide')" v-html="getTemplate()" :class="get(cschema, 'templateOptions.wrapperClassName')"></div>
                                        </template>
                                        <template #input>
                                            <div :class="get(cschema, 'templateOptions.wrapperClassName')">
                                                <label :for="cschema.atts.id">{{cschema.templateOptions.label}}</label>
                                                <input v-bind="cschema.atts" v-model="cmodel" @focus="handleEvent('focus', $event)" :ref="setReference" />
                                                <div class="invalid-feedback">
                                                    {{ { ...get(this, 'options.validationMessages'), ...get(this, 'cschema.validation.messages') }.required }}
                                                </div>
                                            </div>
                                        </template>
                                        <template #button>
                                            <div :class="get(cschema, 'templateOptions.wrapperClassName')">
                                                <button v-bind="cschema.atts" @click="handleEvent('click', $event)">{{cschema.templateOptions.label}}</button>
                                            </div>
                                        </template>
                                        <template #select>
                                            <label>{{cschema.templateOptions.label}}</label>
                                            <select v-bind="cschema.atts" v-model="cmodel">
                                                <template v-for="option in cschema.templateOptions.options">
                                                    <option :value="option.value" :selected="option.value === cschema.atts.defaultValue">{{option.label}}</option>
                                                </template>
                                            </select>
                                            <div class="invalid-feedback">
                                                {{ { ...get(this, 'options.validationMessages'), ...get(this, 'cschema.validation.messages') }.required }}
                                            </div>
                                        </template>
                                        <template #textarea>
                                            <div :class="get(cschema, 'templateOptions.wrapperClassName')">
                                                <textarea v-bind="cschema.atts" v-model="cmodel" @focus="handleEvent('focus', $event)"></textarea>
                                            </div>
                                        </template>
                                        <template #default>
                                            <div>
                                                Not supported tag: {{cschema.type}}
                                            </div>
                                        </template>
                                    </v-switch>                                                       
                                </template>
                            </component>
                        `,
  };

  const _RENDER_CONTROLS = {
    emits: ['updateModel'],
    props: {
      schema: {
        type: Array,
        validator: function (value) {
          return Array.isArray(value) && value.length > 0;
        },
      },
      options: {
        type: Object,
        default: () => ({}),
      },
      form: {
        type: Object,
        default: () => ({}),
      },
      model: {
        type: Object,
        default: () => ({}),
      },
    },
    setup({ schema, model, options, form }, { emit }) {
      //if(!Array.isArray(schema)) return console.error('schema should be array type', schema);
      //if(isEmpty(schema)) return console.error('must have atleast 1 field information', schema);

      const fn = (s, _model) => {
        const { key, atts } = s;

        // setting default value to model
        const defaultValue = Util.get(atts, 'defaultValue', s.defaultValue);
        if (key && defaultValue && _model[key] == undefined) {
          _model[key] = defaultValue;
        }
      };
      schema?.forEach((s) => fn(s, model));

      return { model };
    },
    created() {
      Object.assign(this.form, {
        model: this.model,
        schema: this.schema,
        options: this.options,
      });
    },
    watch: {
      model: {
        handler(newVal, oldVal) {
          this.cmodel = newVal;
        },
      },
      cmodel: {
        handler(newVal, oldVal) {
          this.$emit('updateModel', newVal);
        },
      },
    },
    data() {
      return {
        cmodel: this.model,
      };
    },
    methods: {
      setModel($event, cmp) {
        if (cmp.key) {
          this.cmodel[cmp.key] = $event;
        } else if (cmp.hasOwnProperty('group')) {
          Object.assign(this.cmodel, $event);
        }
      },
    },
    template: `
                            <template v-for="cmp in schema" :key="cmp.key">
                                <render-control :schema="cmp" :model="cmodel[cmp.key]" :form="form"
                                    @updateModel="setModel($event, cmp)"></render-control>
                            </template>
                        `,
  };

  const switchCmp = {
    props: ['case'],
    setup(props, { slots }) {
      if (props.case && slots[props.case]) {
        return slots[props.case];
      }
      if (slots.default) {
        return slots.default;
      }
      return 'div';
    },
  };

  const _SCOPED_STYLE = {
    mounted() {
      const css = this.$options.css;
      if (!css) return;

      const randomUniqueId = 'scoped-css-' + this.$.uid;
      const scopedStyle = css
        .replace(':root', '')
        .replace(/([^]*?)({[^]*?}|,)/g, `\n.${randomUniqueId} $1 $2`);
      const style = document.createElement('style');
      style.insertAdjacentHTML('afterbegin', scopedStyle);
      if (this.$el.nodeType != 1)
        throw `Scoped css supported only for Node Type 1 but found Node Type ${this.$el.nodeType} ${css}`;
      this.$el.classList.add(randomUniqueId);
      this.$el.prepend(style);
    },
  };

  const _COMPONENTS = {
    install(app) {
      app
        .component('render-control', _RENDER_CONTROL)
        .component('render-controls', _RENDER_CONTROLS)
        .component('v-switch', switchCmp)
        //https://stackoverflow.com/questions/43293401/conditionally-rendering-parent-element-keep-inner-html
        .component('v-fragment', {
          template: `<slot></slot>`,
        });
    },
  };

  return {
    Util: _Util,
    COMPONENTS: _COMPONENTS,
    INPUT_MIXIN: _INPUT_MIXIN,
    RENDER_CONTROL: _RENDER_CONTROL,
    RENDER_CONTROLS: _RENDER_CONTROLS,
    SCOPED_CSS: _SCOPED_STYLE,
  };
})(params.console);

/**
 * App code
 */

setTimeout(() => {
  const { createApp, h, ref } = Vue;

  const app = createApp({});
  app.use(COMPONENTS);
  app.mixin(SCOPED_CSS);

  params.console && console.log('params', params);
  app.config.globalProperties.params = params;

  app
    .component('app-view', {
      data() {
        return {
          model: {},
          schema: [
            {
              key: 'Name',
              templateOptions: {
                wrapperClassName:
                  'pb-4 px-md-4 col-12 col-md-4 field-control-Name',
              },
              atts: {
                defaultValue: 'titan',
                required: true,
                className: 'form-control',
                placeholder: 'Name',
              },
              validation: {
                messages: [
                  {
                    name: 'required',
                    msg: 'Complete this field.',
                  },
                ],
              },
              type: 'float-input',
              events: [
                {
                  name: 'set',
                  value: {
                    fn: 'initPop',
                    options: {
                      popOp: {
                        title: 'Name',
                        content: 'Business legal name',
                      },
                    },
                  },
                },
              ],
            },
          ],
        };
      },
      template: `
        <render-controls
          :schema="schema"
          :model="model"
          @updateModel="model = $event"></render-controls>
          <code>{{model}}</code>
      `,
    })
    .component('float-input', {
      mixins: [INPUT_MIXIN],
      methods: {
        focusInput() {
          this.$nextTick(() => {
            this.$refs.input.focus();
          });
        },
      },
      css: `
        input {
            height: var(--input-height);
            font-size: var(--input-font);
        }
        .input-group .form-control {
            border-radius: .25rem;
        }
        .input-group:not(.float-addon) .has-float-label {           
            width: calc(100% - 55px);   
        }  
        .input-group:not(.float-addon) .has-float-label:not(:last-child),
        .input-group:not(.float-addon) .has-float-label:not(:last-child) .form-control {
            border-bottom-right-radius: 0;
            border-top-right-radius: 0;
            border-right: 0
        }
        .input-group:not(.float-addon) .has-float-label:not(:first-child),
        .input-group:not(.float-addon) .has-float-label:not(:first-child) .form-control {
            border-bottom-left-radius: 0;
            border-top-left-radius: 0
        }

        .input-group.float-addon.left-addon .form-control {           
            padding-left: 30px;
        }
        .input-group.float-addon.right-addon .form-control {           
            padding-right: 30px;
        }
        .input-left-addon,
        .input-right-addon {
            position: absolute;
            height: 100%;
            width: auto;
            background: transparent;
            border: 0;
            top: 0;
        }
        .input-right-addon {
            right: 0;                
        }
        .input-left-addon {
            left: 0;                
        }
        .read-only {
            caret-color: transparent;
            cursor: default;
        }                        
    `,
      template: `
        <div :class="{'left-addon': templateOptions.addonLeft, 'right-addon': templateOptions.addonRight}">
            <div  class="position-relative w-100" v-bind="templateOptions.innerWrapper">
                <!--<component v-bind:is="templateOptions && (templateOptions.addonLeft || templateOptions.addonRight) ? 'div' : 'v-fragment'" class="position-relative w-100">-->
                    <template v-if="templateOptions.addonLeft">                        
                        <template v-if="templateOptions.addonLeft.html">
                            <span class="input-group-text input-left-addon" :class="templateOptions.addonLeft.className" v-html="templateOptions.addonLeft.html"></span>
                        </template>
                        <template v-else>
                            <span class="input-group-text input-left-addon" :class="templateOptions.addonLeft.className">
                                {{templateOptions.addonLeft.text}}
                            </span>
                        </template>
                    </template>
    
                    <label class="has-float-label">
                        <input v-bind="atts" placeholder=" " ref="input"  :style="atts.style"                                 
                            :value="model" 
                            @input="updateModel($event.target.value)"   
                            @focus='$emit("focus", $event)' 
                            @blur='$emit("blur", $event)'>
                        <span>{{atts.placeholder}}</span>
                        <!-- <div class="invalid-feedback" v-html="validationMessage"></div> -->
                    </label>            

                    <template v-if="templateOptions.addonRight">                        
                        <template v-if="templateOptions.addonRight.html">
                            <span @click="focusInput" class="input-group-text input-right-addon" :class="templateOptions.addonRight.className" v-html="templateOptions.addonRight.html"></span>
                        </template>
                        <template v-else>
                            <span class="input-group-text input-right-addon" :class="templateOptions.addonRight.className" @click="focusInput">
                                <i :class="templateOptions.addonRight.internalClassName" v-if="templateOptions.addonRight.internalClassName"></i>
                                {{templateOptions.addonRight.text}}
                            </span>
                        </template>
                    </template>
                <!--</component>-->
            </div>
            <div :class="{'has-error-msg': !!validationMessage}" v-html="validationMessage"></div> <!-- Moved to last to align right addon -->
        </div>
    `,
    });

  app.mount('#app');
}, 1000);
