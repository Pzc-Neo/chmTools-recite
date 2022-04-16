(function () {
    "use strict";

    const {
        ipcMain,
        dialog
    } = require('electron')

    // const fs = require('fs')
    const path = require('path')

    module.exports = {
        data: {
            tool_key: ''
        },

        /**
         * 打开软件的时候执行
         * @param {Object} ct 主进程传递过来的
         */
        init: function (ct) {
            let tool = require('./tool.config.json')
            this.data.tool_key = ct.util.make_tool_key(tool)
            // 添加监听器(可以为空，但必须要有)
            ipcMain.on(this.data.tool_key, (event, arg) => {
                let win = ct.wins[this.data.tool_key]
                if (arg == "save") {
                    this.save_database(event)
                } else if (arg == "open") {
                    this.open_database(event)
                } else if (arg == 'win_close') {
                    win.close()
                    event.returnValue = "已关闭窗口"
                } else if (arg == 'win_always_on_top') {
                    win.setAlwaysOnTop(!win.isAlwaysOnTop())
                    event.returnValue = "切换置顶"
                } else if (arg == 'win_minimize') {
                    win.minimize()
                    event.returnValue = "窗口最小化"
                } else if (arg == 'win_maximize') {
                    if (win.isMaximized()) {
                        win.unmaximize()
                        event.returnValue = '取消最大化'
                    } else {
                        win.maximize()
                        event.returnValue = '最大化'
                    }
                }
            })
        },
        // 关闭软件的时候执行(可以为空，但必须要有)
        destroyed: function () {
            // 移除本软件的所有监听器
            ipcMain.removeAllListeners(this.data.tool_key)
        },

        open_database: function (event) {
            dialog.showOpenDialog({
                title: "请选择想要打开的.db文件",
                buttonLabel: "打开",
                defaultPath: path.join(__dirname, "/data/user_database"),
                filters: [{
                    name: 'Custom File Type',
                    extensions: ['db']
                    // extensions: ['js', 'html', 'json']
                }],
                properties: [{
                    multiSelections: false,
                    openDirectory: false,
                    openFile: true,
                }]

            }).then(result => {
                // console.log(result.canceled)
                // console.log(result.filePaths)
                event.returnValue = result
            }).catch(err => {
                console.log(err)
            })
        },

        save_database: function (event) {
            dialog.showSaveDialog({
                title: "请选择要保存到的文件夹",
                buttonLabel: "确定",
                defaultPath: path.join(__dirname, "/data/user_database"),
                filters: [{
                    name: 'Custom File Type',
                    extensions: ['db']
                    // extensions: ['js', 'html', 'json']
                }],
                properties: [{
                    multiSelections: false,
                    openDirectory: true,
                    openFile: false,
                }]
            }).then(result => {
                event.returnValue = result.filePath
            }).catch(err => {
                console.log(err)
            })
        }


        // app.on('before-quit', () => {
        // })
    }
})()