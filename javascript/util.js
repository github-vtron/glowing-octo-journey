/**
 * 提供开发中常常用到的小功能，例如获取随机颜色, 函数节流等
 * @author: sange
 * @date: 2016-05-26
 */

/**
 * 功能列表
 *
 * 1. 获取两个整数之间的随机整数: Util.random(10, 20)
 *
 * 2. 获取随机颜色: Util.getRandomColor(), rgba, 透明度范围为[0, 0.1, 0.2, ... 1]
 *
 * 3. 数字递增或递减动画: Util.increasingNumber(numberContainer, startNumber, endNumber, increaseStep, callback)
 *
 * 4. 函数节流，每N次调用才执行一次：Util.throttleByTimes(func, times)
 *
 * 5. 函数节流，重复调用函数时在某个时间段内只有最后一次执行：Util.runOnceByDelay(func, delay)
 *
 * 6. 设置目标节点可拖拽：Util.setDraggable(target, handlerSelector, dragendCallback)
 *
 * 7. 弧度转换为角度：Util.radToDeg(rad)
 *
 * 8. 角度转换为弧度：Util.degToRad(deg)
 */

"use strict";

window.Util = window.Util || {
    /**
     * 为了避免冲突在需要时添加的前缀
     */
    _prefix: '_s_',
    
    /**
     * 获取两个整数之间的随机整数
     * @param {integer} a
     * @param {integer} b
     * @return {integer}
     */
    random: function(a, b) {
        a = parseInt(a);
        b = parseInt(b);
        return a + Math.round((b - a) * Math.random());
    },
    
    /**
     * 获取随机颜色
     * @return {string} rgba表示的随机颜色
     */
    getRandomColor: function() {
        var r = this.random(0, 255),
            g = this.random(0, 255),
            b = this.random(0, 255),
            a = this.random(0, 10) / 10;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    },
    
    /**
     * 数字递增或递减动画
     * @param {dom object} numberContainer - 数字所在容器
     * @param {number} startNumber - 动画开始时的数字大小
     * @param {number} endNumber - 动画结束时的数字大小
     * @param {number} increaseStep - 数字动画增长步长
     * @param {function} callback - 动画结束后的回调
     * @return {} 无返回值
     */
    
    increasingNumber: function(numberContainer, startNumber, endNumber, increaseStep, callback) {
        if((startNumber > endNumber && increaseStep > 0) || (startNumber < endNumber && increaseStep < 0)) {
            console.warn('开始数字大于结束数字时不能递增，或者开始数字小于结束数字时不能递减');
            return;
        }
        
        if(numberContainer._requestId) {
            cancelAnimationFrame(numberContainer._requestId);  // 第一次动画还没执行完开始下一次动画时，取消上一次的动画
        }
        
        startNumber = parseFloat(startNumber);
        endNumber = parseFloat(endNumber);
        increaseStep = parseFloat(increaseStep);
        
        var curNumber = startNumber,
            decimalPlaces = (increaseStep.toString().split('.')[1] || '').length;  // 最后要保留的小数位数
        
        // 使用闭包返回函数的方式避免重复判断数字是递增还是递减方式
        var isCompleted = (function() {  // 数字是否已经递增到最大或者递减到最小
            if(startNumber < endNumber) {  // 数字递增到最大
                return function() {
                    return curNumber >= endNumber;
                };
            } else {  // 数字递减到最小
                return function() {
                    return curNumber <= endNumber;
                };
            }
        })();
        
        function setNumber() {
            numberContainer.textContent = curNumber.toFixed(decimalPlaces);
            curNumber += increaseStep;
            if(isCompleted()) {
                numberContainer.textContent = endNumber;
                callback();
            } else {
                numberContainer._requestId = requestAnimationFrame(setNumber);
            }
        }
        numberContainer._requestId = requestAnimationFrame(setNumber);
    },
    
    /**
     * 函数节流，每N次调用才执行一次
     * @param {function} func - 要执行的函数
     * @param {number} times - N的大小，每执行一次函数需要等待的次数
     * @return {} 无返回值
     */
    throttleByTimes: function(func, times) {
        times = parseInt(times);
        var funcAttr = this._prefix + 'times_';  // 在func上保存当前调用throttleByTimes次数的属性
        func[funcAttr] = ((func[funcAttr] || 0) + 1) % times;
        if(func[funcAttr] == 0) {
            func();
        }
    },
    
    /**
     * 函数节流，重复调用函数时在某个时间段内只有最后一次执行
     * @param {function} func - 要执行的函数
     * @param {number} delay - 延迟执行的时间(ms)
     * @return {} 无返回值
     */
    runOnceByDelay: function(func, delay) {
        var timeoutId = this._prefix + 'timeout_';  // 在func上保存定时器ID
        clearTimeout(func[timeoutId]);
        func[timeoutId] = setTimeout(() => func(), delay);
    },
    
    /**
     * 设置目标可拖拽
     * @param {dom object} target - 要设置拖拽功能的元素, 必选
     * @param {string} handlerSelector - 目标下面响应拖拽事件的子元素选择器，可选
     * @param {function} dragendCallback - 拖拽完并放开鼠标之后的回调函数，可选
     * @return {} 无返回值
     */
    setDraggable: function(target, handlerSelector, dragendCallback) {
        var draggableClassName = this._prefix + 'isdraggable';
        if (target.classList.contains(draggableClassName)) {
            return;
        }
        
        var movementX = 0,  //拖拽过程中鼠标总共移动的水平方向的距离
            movementY = 0,  //拖拽过程中鼠标总共移动的垂直方向的距离
            dialogLeft = 0,  //目标当前在水平方向的位置
            dialogTop = 0,  //目标当前在水平方向的位置
            dialogOriginalTransform,  //对话框在拖拽之前的transform变换
            isInlineTransform = false;  //对话框在拖拽之前的transform变换是否是设置在style属性的
        
        var mouseFun = function(e) {
            if(e.type == 'mousedown') {
                document.addEventListener('mousemove', mouseFun, false);
                document.addEventListener('mouseup', mouseFun, false);
                var tmpStyles = getComputedStyle(target);
                if (tmpStyles.position == 'static') {
                    target.style.position = 'relative';
                }
                movementX = 0;
                movementY = 0;
                dialogLeft = parseInt(tmpStyles.left == 'auto' ? 0 : tmpStyles.left);
                dialogTop = parseInt(tmpStyles.top == 'auto' ? 0 : tmpStyles.top);
                isInlineTransform = !!target.style.transform;
                dialogOriginalTransform = target.style.transform || tmpStyles.transform;
                return;
            }
            if(e.type == 'mousemove') {
                //鼠标只点击一下的情况
                if (e.movementX == 0 && e.movementY == 0) {
                    return;
                }
                
                movementX += e.movementX;
                movementY += e.movementY;
                if (dialogOriginalTransform == 'none') {
                    target.style.transform = `translate3d(${movementX}px, ${movementY}px, 0)`;
                } else {
                    target.style.transform = `translate3d(${movementX}px, ${movementY}px, 0) ${dialogOriginalTransform}`;
                }
                return;
            }
            if(e.type == 'mouseup') {
                document.removeEventListener('mousemove', mouseFun, false);
                document.removeEventListener('mouseup', mouseFun, false);
                dialogLeft += movementX;
                dialogTop += movementY;
                target.style.left = dialogLeft + 'px';
                target.style.top = dialogTop + 'px';
                if (!isInlineTransform) {
                    target.style.removeProperty('transform');
                } else {
                    target.style.transform = dialogOriginalTransform;
                }
                dragendCallback && dragendCallback();
            }
        };
        
        var handler = handlerSelector ? target.querySelector(handlerSelector) : target;
        handler.addEventListener('mousedown', mouseFun, false);
        
        target.classList.add(draggableClassName);
    },
    
    /**
     * 弧度转换为角度
     * @param {number} rad - 弧度
     * @return {number} 转换之后的角度
     */
    radToDeg: function(rad) {
        return 180 / Math.PI * rad;
    },
    
    /**
     * 角度转换为弧度
     * @param {number} deg - 角度
     * @return {number} 转换之后的弧度
     */
    degToRad: function(deg) {
        return Math.PI / 180 * deg;
    }
};