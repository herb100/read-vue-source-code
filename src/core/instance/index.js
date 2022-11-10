import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// vue 构造函数
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // 调用 Vue.prototype._init 方法
  this._init(options)
}
// 初始化混入
initMixin(Vue)
// 
stateMixin(Vue)
// 事件混入
eventsMixin(Vue)
// 生命周期混入
lifecycleMixin(Vue)
// 渲染混入
renderMixin(Vue)

export default Vue
