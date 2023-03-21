import './style.css';

import data from './schema.json';
console.log({ data });

import './utils.js';
import { Util, COMPONENTS, INPUT_MIXIN, SCOPED_CSS } from './json-renderer.js';

/**
 * App code
 */

setTimeout(() => {
  const { createApp, h, ref } = Vue;

  const app = createApp({});
  app.use(COMPONENTS);
  app.mixin(SCOPED_CSS);

  app
    .component('app-view', {
      data() {
        return {
          model: {},
          schema: data,
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
    })
    .component('wrapper-3', {
      template: `
      <div class="col-6">
          <div class="border me-0 pt-4 row">
              <slot></slot>
          </div>
      </div>
      `,
    });

  app.mount('#app');
}, 1000);
