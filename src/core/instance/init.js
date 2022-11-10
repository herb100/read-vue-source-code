/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  // 初始化 Vue
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    // 每个 Vue 实例都有一个 _uid
    // QW: 怎么运行的，怎么使用的
    vm._uid = uid++

    // 初始化性能测量
    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // 避免被观察者观察
    // a flag to avoid this being observed
    vm._isVue = true
    // 处理组件配置项
    // merge options
    if (options && options._isComponent) {
      /**
       * 初始化子组件
       * 将组件配置对象上的一些深层次属性放到 vm.$options 选项中，以提高代码的执行效率
       * 
       * 优化子组件实例化，因为动态选项合并非常慢，并且没有子组件需要特殊处理
       * QW：如何优化的？怎么体现
       */
      
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      /**
       * 初始化根组件
       * 合并 Vue 的全局配置到根组件的局部配置，
       * 比如 Vue.component 注册的全局组件会合并到根实例的 components 选项中
       * 
       * 组件的选项合并发生在两个地方：
       *   1、全局组件注册 Vue.component(compName, comp) 做了选项合并。合并 Vue 内置的全局组件和用户自己注册的全局组件，最后放到全局的 components 选项中
       *   2、局部注册 { components: { xx } } 执行编译器生成的 render 函数时做了选项合并，将全局的 components 配置合并到组件局部的配置项
       *   3、这里的根组件
       */
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      // 设置代理，将 vm 实例上的属性代理到 _renderProxy
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // _self 暴露自己
    // expose real self
    vm._self = vm

    // 组件关系属性的初始化，如 $parent、$children、$root、$refs 等
    initLifecycle(vm)
    /**
     * 初始化自定义事件，这里需要注意一点，我们在 <comp @click="handleClick" /> 上注册的事件，监听者不是父组件，
     * 而是子组件本身，也就是说事件的派发和监听者都是子组件本身，和父组件无关
     * this.$emit('click') this.$on('click', function handleClick() {})
     */
    initEvents(vm)
    //  解析组件的插槽，获取 this.$slots , 定义 this._c ，即 $createElement 方法，即 h 函数
    initRender(vm)
    callHook(vm, 'beforeCreate')

    // 初始化组件的 inject 配置项，得到 result[key] = val 形式的配置对象，
    // 然后对结果数据进行响应式处理，并代理每个 key 到 vm 实例
    initInjections(vm) // resolve injections before data/props
    // 数据响应式的重点，处理 props、method、data、computed、watch
    initState(vm)
    // 解析组件配置项上的 provide 对象，将其挂载到 vm._provided 属性上
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }
    
    // 如果配置上有 el 选项，则自动调用 $mount 方法
    // 即有 el 选项就不用手动调用 $mount 方法，没有就需要手动调用
    if (vm.$options.el) {
      // 调用 $mount 方法，进入挂载阶段
      vm.$mount(vm.$options.el)
    }
  }
}

// 打平配置对象上的属性，减少运行时原型链的动态查找，提高执行效率
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  // 有 render 函数，复制到 vm.$options 上
  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

// 从构造函数上的配置项
export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    // 存在基类，递归解析基类构造函数的选项
    const superOptions = resolveConstructorOptions(Ctor.super)
    // 缓存基类配置项
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // 基类配置选项改变，需要重新设置
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // 检查Ctor.options上是否有任何后期修改/附加选项
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // 如果存在被修改或增加的选项，则合并两个选项
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // 选项合并，并将结果赋值为Ctor.options
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  // 构造函数选项
  const latest = Ctor.options
  // 密封的构造函数选项，备份
  const sealed = Ctor.sealedOptions
  // 记录并返回不一致的选项
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
