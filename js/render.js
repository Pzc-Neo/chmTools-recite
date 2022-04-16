const fs = require("fs");
const { ipcRenderer } = require("electron");

var EventEmitter = require("events").EventEmitter;
var NodeEvent = new EventEmitter();

const path = require("path");

var sqlite3 = require("sqlite3").verbose();

// 数据库
var database = "";

let tool_config = require(path.join(__dirname, "tool.config.json"));
let tool_key = ipcRenderer.sendSync("get_tool_key", tool_config);

var app = new Vue({
  el: "#app",
  mounted: function () {
    var temp_app = this;

    // 连接上次打开的数据库
    let last_database_path_config = path.join(
      __dirname,
      "/data/database_template/last_open_database.config"
    );
    let last_database_path = fs
      .readFileSync(last_database_path_config)
      .toString();
    if (fs.existsSync(last_database_path)) {
      this.connect_database(last_database_path);
    } else {
      this.connect_database();
    }

    // 初始化数据
    this.init_data();
    // this.get_property("current_group_info")

    // 设置内容高度
    // this.style_content.height = document.body.clientHeight - parseFloat(this.style_tool_bar.height) - 40 + "px"

    // 35是文件搜索框的高度
    // this.style_file_ul.height = document.body.clientHeight - 20 - 35 + "px"
    // // 110是 搜索框、"所有文件"按钮和“今日份复习”按钮的高度
    // this.style_group_ul.height = document.body.clientHeight - 20 - 110 + "px"

    // window.onresize = () => {
    //     // 设置内容高度
    //     this.style_content.height = document.body.clientHeight - parseFloat(this.style_tool_bar.height) - 40 + "px"
    //     // 35是文件搜索框的高度
    //     this.style_file_ul.height = document.body.clientHeight - 20 - 35 + "px"
    //     // 110是 搜索框、"所有文件"按钮和“今日份复习”按钮的高度
    //     this.style_group_ul.height = document.body.clientHeight - 20 - 110 + "px"
    // }

    // 快捷键
    window.addEventListener(
      "keydown",
      function (event) {
        // 切换模板
        if (event.code == "Backquote") {
          // 大键盘区的`
          temp_app.handle_text("source");
        } else if (event.code == "Digit1") {
          // 大键盘区的1
          temp_app.handle_text("T1");
        } else if (event.code == "Digit2") {
          temp_app.handle_text("T2");
        } else if (event.code == "Digit3") {
          temp_app.handle_text("T3");
        } else if (event.code == "Digit4") {
          temp_app.handle_text("T4");
        } else if (event.ctrlKey && event.code == "Digit5") {
          temp_app.switch_language_mode("中文模式");
        } else if (event.ctrlKey && event.code == "Digit6") {
          temp_app.switch_language_mode("英文模式");
        } else if (event.ctrlKey && event.code == "Digit7") {
          temp_app.switch_language_mode("日文模式");

          // 设置字号
        } else if (event.ctrlKey && event.altKey && event.key == "=") {
          temp_app.change_font_size("+");
        } else if (event.ctrlKey && event.altKey && event.key == "-") {
          temp_app.change_font_size("-");
        } else if (event.ctrlKey && event.altKey && event.key == "0") {
          temp_app.change_font_size("default");
        }

        // 新建文件和分组
        else if (event.ctrlKey && event.key == "n") {
          temp_app.new_file();
        } else if (event.ctrlKey && event.key == "g") {
          temp_app.new_group();
        }
        // 组置顶
        else if (event.ctrlKey && event.key == "t") {
          temp_app.group_to_top();
        }
        // 保存文件
        else if (event.ctrlKey && event.key == "s") {
          temp_app.save_file();
        }
        // 删除分组
        else if (event.ctrlKey && event.altKey && event.key == "d") {
          temp_app.delete_current_group();
        }
        // 删除文件
        else if (event.ctrlKey && event.key == "d") {
          temp_app.delete_current_file();
        }
        // 备份数据库
        else if (event.ctrlKey && event.altKey && event.key == "b") {
          temp_app.backup_database();
        } else if (event.ctrlKey && event.key == "b") {
          temp_app.toggle_content_style("fontWeight");
        } else if (event.ctrlKey && event.key == "e") {
          temp_app.toggle_green_mode();
        }
      },
      true
    );
  },
  data: {
    // 替换符号
    symbol: "__",
    is_contenteditable: false,
    temp_text: "",
    // 源文本
    source_content: "Hello Vue!",
    // 总字数
    word_count: 0,
    // 处理后的文本
    final_content: "",
    theme: {
      color: "#333",
      // color: "red",
      // backgroundColor: "#C7EDCC",
      // color:"#fff",
      // backgroundColor: "#555",
      // backgroundColor: "#F1F4FB",
      // backgroundColor: "#F1F4FB",
      backgroundColor: "#fff",
      fontSize: "15px",
      // lineHeight: "25px",
    },
    // 下划线颜色
    border_bottom_color: "#333",
    // 内容的样式
    style_content: {
      fontSize: "15px",
      fontWeight: "normal",
      lineHeight: "25px",
    },
    style_file_area: {},
    style_tool_bar: {
      height: "75px",
    },
    // style_subject_ul: {
    //     height: "500px"
    // },
    style_group_ul: {
      height: "500px",
    },
    style_file_ul: {
      height: "500px",
    },
    current_subject: "",
    current_subject_id: "",
    current_subject_name: "",
    current_subject_list: [
      {
        id: "id1",
        title: "古汉语",
      },
      {
        id: "id2",
        title: "英语",
      },
      {
        id: "id3",
        title: "日语",
      },
      {
        id: "id4",
        title: "现代汉语",
      },
    ],

    current_group: "",
    current_group_id: "",
    current_group_name: "",
    current_group_list: [],
    current_file: "",
    current_file_id: "",
    current_file_name: "",
    current_file_list: [],
    // 通知消息
    notification: "",
    style_notification: {
      display: "none",
      transition: "all 0.2s ease-in-out",
    },
    language_mode: "中文模式",
    is_green_mode: false,
    green_mode_btn_value: "护眼(关)",
    // 阶段
    // stage: [1, 7, 14, 21, 30],
    current_template: "source",
    current_template_name: "源文本",
    // 正则框
    is_hidden_regExp: true,
    // 正则文本
    regExp_source_text: "",
    regExp_replace_text: "",

    group_search_text: "",
    file_search_text: "",
    current_date_interval: {},
    // 几天后复习
    // 这里的一天指的是完整的一天，比如说，文章在今天中午12点加入复习计划，会到第二天的中午12点才会出现在“今日份复习”列表中。
    remaining_days: 0,
    // review_stage_list: {
    //     1: 1,
    //     2: 2,
    //     3: 3,
    //     4: 4,
    //     5: 5,
    //     6: 6,
    //     7: 7,
    // },
    review_stage_list: {
      1: 1,
      2: 2,
      3: 7,
      4: 14,
      5: 21,
      6: 30,
      7: 60,
      8: 180,
    },
    // 是否已添加到复习计划
    is_add_to_review_project: false,
    add_to_review_project_btn_value: "加入复习",
    // 改变科目的时候，是否同时改变分组
    is_change_group: false,
    // 改变分组的时候，是否同时改变文件
    is_change_file: false,

    backup_database_list: [],
    current_database_path: "",
    database_name: "",
    win_always_on_top: false,
    style_contextmenu: {
      display: "none",
      top: "0px",
      left: "0px",
    },
    contextmenu_param: {
      type: "subject",
      item: {},
    },
  },
  methods: {
    connect_database: function (database_path) {
      console.log(database_path);
      // 如果已经连接了数据库，就先断开
      if (typeof database == "object") {
        try {
          database.close();
        } catch (err) {
          throw err;
        }
      }
      // 打开默认的数据库
      if (database_path == undefined) {
        database_path = path.join(__dirname, "/data/default_datebase.db");
      }

      // var database = ""
      try {
        database = new sqlite3.Database(database_path);
        this.current_database_path = database_path;

        let extname = path.extname(database_path);
        this.database_name = path.basename(database_path, extname);

        // document.title = "残文背诵->" + database_path
        let last_database_path_config = path.join(
          __dirname,
          "/data/database_template/last_open_database.config"
        );
        fs.writeFileSync(last_database_path_config, database_path);
      } catch (err) {
        throw err;
      }
    },
    str_to_date: function (date_str) {
      let temp = date_str.replace(/[^\d:]/g, "/").replace("//", "/");
      return new Date(temp);
    },
    // 排序 - 按更新时间
    sort_group: function (groups) {
      let temp_app = this;
      groups.sort((a, b) => {
        var a_date = temp_app.str_to_date(a.update_date);
        var b_date = temp_app.str_to_date(b.update_date);
        return b_date - a_date;
      });
      return groups;
    },
    init_data: function () {
      var temp_app = this;
      // 获取所有分组
      database.all(
        "select * from subjects order by sort_num ASC",
        function (err, subjects) {
          temp_app.current_subject_list = subjects;
        }
      );

      // 属性
      database.all("select * from configs", function (err, configs) {
        if (err) {
          throw err;
        } else {
          configs.forEach((config) => {
            let property = config.property;
            let value = config.value;
            if (property == "content_font_size") {
              temp_app.style_content.fontSize = value;
            } else if (property == "content_line_height") {
              temp_app.style_content.lineHeight = value;
            } else if (property == "is_green_mode") {
              temp_app.is_green_mode = value == 1 ? 0 : 1;
              temp_app.toggle_green_mode();
            } else if (property == "current_template") {
              temp_app.current_template = value;
            } else if (property == "current_subject_info") {
              if (value != null && value != "") {
                let subject = JSON.parse(value);
                temp_app.is_change_group = true;
                temp_app.change_subject(subject.id, subject.title);
              }
            }
          });
        }
      });
    },
    get_date_interval: function (date1, date2) {
      //时间差的毫秒数
      var date3 = date2.getTime() - new Date(date1).getTime();
      //------------------------------
      //计算出相差天数
      var days = Math.floor(date3 / (24 * 3600 * 1000));
      //计算出小时数
      var leave1 = date3 % (24 * 3600 * 1000); //计算天数后剩余的毫秒数
      var hours = Math.floor(leave1 / (3600 * 1000));
      //计算相差分钟数
      var leave2 = leave1 % (3600 * 1000); //计算小时数后剩余的毫秒数
      var minutes = Math.floor(leave2 / (60 * 1000));
      //计算相差秒数
      var leave3 = leave2 % (60 * 1000); //计算分钟数后剩余的毫秒数
      var seconds = Math.round(leave3 / 1000);
      var result_date = {
        // 加1符合本软件的需求，正常情况不用加1
        days: days,
        hours: hours,
        minutes: minutes,
        seconds: seconds,
      };
      return result_date;
      // 示例
      // //开始时间
      // var date1= '2021/05/09 00:00:00';
      // //结束时间
      // var date2 = new Date();
      // let temp =get_date_interval(date1,date2)
    },
    // 显示通知
    show_notification: function (notification) {
      this.notification = notification;
      this.style_notification.display = "block";

      var temp_app = this;
      setTimeout(function () {
        temp_app.notification = "";
        temp_app.style_notification.display = "none";
      }, 1500);
    },
    // 字符串+时间戳
    random_str: function (str) {
      var timestamp = Date.parse(new Date());

      let len = 16;
      var $chars =
        "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678"; /****默认去掉了容易混淆的字符LoOl,9gq,Vv,Uu,I1****/
      var maxPos = $chars.length;
      var pwd = "";
      for (let i = 0; i < len; i++) {
        pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
      }
      return str + "-" + timestamp + "-" + pwd;
    },
    // 统计字数
    get_word_count: function (content) {
      if (this.language_mode == "中文模式") {
        content = content.replace(/[^\u4e00-\u9fa5]/g, "");
        this.word_count = content.split("").length;
      } else if (this.language_mode == "日文模式") {
        // reg = /([ぁ-んァ-ヶ]|[\u4e00-\u9fa5])/i
        // content = content.replace(/([^ぁ-んァ-ヶ]|[^\u4e00-\u9fa5])/g, "")
        content = content.replace(/[^\u0800-\u4e00]/g, "");
        // content = content.replace(/[^ぁ-ん]/g, "")
        // content = content.replace(/[^ァ-ヶ]/g, "")
        // content = content.replace(/[\,\.\"\'\?\(\)\\\-\=\_\+\*\&\^\%\$\#\@\!\~\`\{\}\[\] ，。；“”‘’]/g, "")
        this.word_count = content.split("").length;
      } else if (this.language_mode == "英文模式") {
        this.word_count = content.split(" ").length;
      }
    },
    set_content: function (data, mode) {
      data = data.replace(/[\n]/g, "<br/>");
      this.source_content = data;

      // 统计字数
      this.get_word_count(data);

      this.final_content = data;
      // this.handle_text(this.current_template)
      if (mode == undefined) {
        this.is_contenteditable = true;
        this.current_template = "source";
        this.show_notification(
          `已切换到: <span style="color:#fff;font-weight:bold">${"源文本"} </span>`
        );
      } else if (mode == "change_file") {
        this.is_contenteditable = true;
        // this.show_notification(`文件: <span style="color:#fff;font-weight:bold">${"已保存"} </span>`)
        // } else if (mode == "change") {
        // this.current_template = "source"
        // console.log(this.current_template)

        this.handle_text(this.current_template);

        this.show_notification(
          `已切换到: <span style="color:#fff;font-weight:bold">${this.current_file_name} </span>`
        );
      }
    },
    replace_text: function (text, is_replace, mode) {
      var final_text = "";
      var text_list = "";

      // 因为暂时把下划线设置成和文字一样的颜色，所以加上这句
      this.border_bottom_color = this.theme.color;

      if (
        this.language_mode == "中文模式" ||
        this.language_mode == "日文模式"
      ) {
        text_list = text.split("");
        var temp_app = this;
        text_list.forEach((str) => {
          var reg = "";
          if (temp_app.language_mode == "中文模式") {
            // 如果是中文的话，转换之后添加到结果字符串
            reg = /[\u4e00-\u9fa5]/i;
          } else {
            // 匹配中文和日文
            // reg = /([\u0800-\u4e00]|[\u4e00-\u9fa5])/i
            reg = /([ぁ-んァ-ヶ]|[\u4e00-\u9fa5])/i;
            // reg = /([\u0800-\u9fa5])/i
          }
          if (reg.test(str)) {
            if (is_replace == false) {
              final_text += str;
              is_replace = true;
            } else {
              final_text += `<span class="chmCL_hidden_text">${str}</span>`;
              is_replace = false;
            }
            // 如果不是中文或者日文
          } else {
            // if (is_replace == false) {
            if (str == "\n") {
              final_text += "<br/>";
            } else {
              final_text += str;
              if (mode == "T1") {
                is_replace = false;
              } else if (mode == "T2") {
                is_replace = true;
              }
            }
            // } else {
            //     if (str == '\n') {
            //         final_text += "<br/>"
            //     } else {
            //         final_text += str
            //     }
            // }
          }
        });
      } else if (this.language_mode == "英文模式") {
        text_list = text.split(/[  ]/g);
        for (i = 0; i < text_list.length; i++) {
          var str = text_list[i];

          // str前面的标点符号
          var before_str = "";
          if (str.substr(0, 1).match(/[^\w<>]/)) {
            before_str = str.substr(0, 1);
            str = str.substr(1, str.length - 1);
          }

          // str后面的标点符号
          var after_str = "";
          if (str.substr(str.length - 1, 1).match(/[^\w<>]/)) {
            after_str = str.substr(str.length - 1, 1);
            str = str.substr(0, str.length - 1);
          }

          if (i % 2 == 0) {
            if (is_replace) {
              final_text +=
                `${before_str}<span class="chmCL_hidden_text">${str}</span>${after_str}` +
                "&nbsp;";
            } else {
              final_text += before_str + str + after_str + "&nbsp;";
            }
          } else {
            if (is_replace) {
              final_text += before_str + str + after_str + "&nbsp;";
            } else {
              final_text +=
                `${before_str}<span class="chmCL_hidden_text">${str}</span>${after_str}` +
                "&nbsp;";
            }
          }
        }
      }

      return final_text;
    },
    handle_text: function (mode) {
      var text = this.source_content;
      this.current_template = mode;
      switch (mode) {
        case "source":
          this.is_contenteditable = true;
          // 为了和其他模板匹配，所以原文的空格替换成和模板一样的空格。
          this.final_content = this.source_content
            .split(/[  ]/g)
            .join("&nbsp;");
          this.current_template_name = "源文本";
          this.show_notification(
            `已切换到: <span style="color:#fff;font-weight:bold">${this.current_template_name} </span>`
          );
          break;
        case "T1":
          this.is_contenteditable = false;
          this.final_content = this.replace_text(text, false, "T1");

          this.current_template_name = "模板一";
          this.show_notification(
            `已切换到: <span style="color:#fff;font-weight:bold">${this.current_template_name} </span>`
          );
          break;
        case "T2":
          this.is_contenteditable = false;
          this.final_content = this.replace_text(text, true, "T2");
          this.current_template_name = "模板二";
          this.show_notification(
            `已切换到: <span style="color:#fff;font-weight:bold">${this.current_template_name} </span>`
          );
          break;
        case "T3":
          this.is_contenteditable = false;
          this.final_content = this.replace_text(text, false, "T3");
          this.current_template_name = "模板三";
          this.show_notification(
            `已切换到: <span style="color:#fff;font-weight:bold">${this.current_template_name} </span>`
          );
          break;
        case "T4":
          this.is_contenteditable = false;
          this.final_content = this.replace_text(text, true, "T4");
          this.current_template_name = "模板四";
          this.show_notification(
            `已切换到: <span style="color:#fff;font-weight:bold">${this.current_template_name} </span>`
          );
          break;

        default:
          // temp_app.change_file(this.current_file_id, this.current_file_name)
          break;
      }
      this.update_database_property("current_template", mode);
    },
    show_all_file: function () {
      var temp_app = this;
      // 获取分组文件
      var query = "select * from files";
      database.all(query, function (err, files) {
        if (files.length == 0) {
          return;
        }
        files = temp_app.sort_group(files);
        temp_app.current_file_list = files;

        // var query = "select * from groups where id='" + group_id + "'"
        // database.all(query, function (err, groups) {
        //     temp_app.update_database_property("current_group_info", JSON.stringify(groups[0]))
        //     temp_app.current_group = groups[0]
        // })
      });

      this.current_group_id = "所有文件";
      // this.current_group_name = group_name
      // // 取消文件的选择
      // this.current_choose_file = -1
    },
    show_today_file: function () {
      var temp_app = this;
      // 获取分组文件
      var query = "select * from files";
      database.all(query, function (err, files) {
        if (files.length == 0) {
          return;
        }

        let temp_file_list = [];
        files.forEach((file) => {
          if (file.reference_date != null) {
            let date1 = temp_app.str_to_date(file.reference_date);
            let date2 = new Date();
            // 时间间隔
            let date_interval = temp_app.get_date_interval(date1, date2);

            if (
              date_interval.days >=
              temp_app.review_stage_list[file.review_stage]
            ) {
              temp_file_list.push(file);
            }
          }
        });
        temp_app.current_file_list = temp_file_list;
      });
      this.current_group_id = "今日份复习";
    },

    // 修改当前分组-分组列表的内容被点击时调用
    change_subject: function (subject_id, subject_name, index) {
      var temp_app = this;
      // 获取分组文件
      var query =
        "select * from groups where subject_id='" +
        subject_id +
        "' order by sort_num ASC";
      database.all(query, function (err, groups) {
        // if (groups.length == 0) {
        //     temp_app.current_group_list = []
        //     temp_app.current_file_list = []
        //     return
        // }
        // groups = temp_app.sort_group(groups)
        temp_app.current_group_list = groups;

        // let value = temp_app.get_property("current_group_info")

        if (temp_app.is_change_group) {
          // 要在上面赋值给current_group_list的语句执行完，再切换分组才不会出错
          // 不然的话，连分组都还没加载，怎么能够切换分组呢？
          let property = "current_group_info";
          database.all(
            "select * from configs WHERE property = '" + property + "'",
            function (err, propertys) {
              if (err) {
                throw err;
              } else {
                let property = propertys[0];
                let value = property.value;
                if (value != null && value != "") {
                  let group = JSON.parse(value);
                  temp_app.is_change_file = true;
                  temp_app.change_group(group.id, group.title);
                }
              }
            }
          );
          temp_app.is_change_group = false;
        }
        // 更新数据库configs中的分组信息
        var query = "select * from subjects where id='" + subject_id + "'";
        database.all(query, function (err, subjects) {
          if (err) {
            throw err;
          } else {
            temp_app.update_database_property(
              "current_subject_info",
              JSON.stringify(subjects[0])
            );
            temp_app.current_subject = subjects[0];
          }
        });
      });
      temp_app.current_subject_id = subject_id;
      temp_app.current_subject_name = subject_name;

      // 取消文件的选择
      // this.current_choose_file = -1
    },

    // 修改当前分组-分组列表的内容被点击时调用
    change_group: function (group_id, group_name, index) {
      var temp_app = this;
      // 获取分组文件
      var query =
        "select * from files where group_id='" +
        group_id +
        "' order by sort_num ASC";
      database.all(query, function (err, files) {
        if (err) {
          throw err;
        } else {
          // files = temp_app.sort_group(files)
          temp_app.current_file_list = files;

          if (temp_app.is_change_file) {
            // 要在上面赋值给current_file_list的语句执行完，再切换分组才不会出错
            // 不然的话，连文件分组都还没加载，怎么能够切换文件呢？
            let property = "current_file_info";
            database.all(
              "select * from configs WHERE property = '" + property + "'",
              function (err, propertys) {
                if (err) {
                  throw err;
                } else {
                  let property = propertys[0];
                  let value = property.value;
                  if (value != null && value != "") {
                    let file = JSON.parse(value);
                    temp_app.change_file(file.id, file.title);
                  }
                }
              }
            );
            temp_app.is_change_file = false;
          }
          // 更新数据库configs中的分组信息
          var query = "select * from groups where id='" + group_id + "'";
          database.all(query, function (err, groups) {
            if (err) {
              throw err;
            } else {
              temp_app.update_database_property(
                "current_group_info",
                JSON.stringify(groups[0])
              );
              temp_app.current_group = groups[0];
            }
          });
        }
      });

      temp_app.current_group_id = group_id;
      temp_app.current_group_name = group_name;
      // console.log(this.current_group_id)
      // console.log(this.current_group_name)
      // 取消文件的选择
      // this.current_choose_file = -1
    },
    // 修改当前分组-分组列表的内容被点击时调用
    change_file: function (file_id, file_name, index) {
      var temp_app = this;
      if (temp_app.current_file.id == file_id) {
        return;
      }
      database.all(
        "select * from files where id='" + file_id + "'",
        function (err, file) {
          if (file.length == 0) {
            return;
          }
          var content = file[0].content;
          temp_app.language_mode = file[0].language_mode;
          temp_app.set_content(content, "change_file");
          temp_app.update_database_property(
            "current_file_info",
            JSON.stringify(file[0])
          );

          temp_app.current_file = file[0];
          if (file[0].reference_date != null) {
            temp_app.is_add_to_review_project = true;
            // 当前文件的更新日期和现在的日期的间隔
            let date_interval = temp_app.get_date_interval(
              temp_app.str_to_date(file[0].reference_date),
              new Date()
            );
            temp_app.current_date_interval = date_interval;

            temp_app.add_to_review_project_btn_value = "移除复习";
            // 几天后复习
            let review_days =
              temp_app.review_stage_list[temp_app.current_file.review_stage];
            // 与参考日期的间隔天数
            const interval_days =
              review_days - temp_app.current_date_interval.days;
            // console.log(review_days, interval_days)
            temp_app.remaining_days = `${interval_days}天${
              interval_days > 0 ? "后" : "前"
            }复习`;
          } else {
            temp_app.is_add_to_review_project = false;
            temp_app.remaining_days = "未加入复习计划";
            temp_app.add_to_review_project_btn_value = "加入复习";
          }
        }
      );

      temp_app.current_file_id = file_id;
      temp_app.current_file_name = file_name;
      // 取消文件的选择
      // this.current_choose_file = -1
    },

    search_group: function () {
      // 构建搜索词 符号参考资料：https://www.runoob.com/sqlite/sqlite-like-clause.html
      // 符号含义：百分号（%）代表零个、一个或多个数字或字符。下划线（_）代表一个单一的数字或字符。这些符号可以被组合使用。

      let temp_app = this;
      // 替换掉空格，并且在每个字符的前面加 % ，字符串最后再加上 % 。例如：把'hello world' 修改成：%h%e%l%l%o%w%o%r%l%d%
      let temp_group_search_text = this.group_search_text
        .replace(/\s+/g, "")
        .replace(/((?=.)|$)/g, "%");

      // let group_id = temp_app.current_group_id

      // let query = "SELECT * FROM files WHERE group_id='" + group_id + "' AND  title like '" + temp_file_search_text + "'"
      // query = "SELECT * FROM groups WHERE title like '" + temp_group_search_text + "'"

      query = `SELECT * FROM groups WHERE title like '${temp_group_search_text}' AND subject_id='${temp_app.current_subject_id}'`;
      // if (group_id == "所有文件") {
      //     query = "SELECT * FROM files WHERE title like '" + temp_file_search_text + "'"
      // }
      // return
      database.all(query, function (err, groups) {
        if (err) {
          throw err;
        } else {
          temp_app.current_group_list = groups;
        }
      });
    },
    search_file: function () {
      // 构建搜索词 符号参考资料：https://www.runoob.com/sqlite/sqlite-like-clause.html
      // 符号含义：百分号（%）代表零个、一个或多个数字或字符。下划线（_）代表一个单一的数字或字符。这些符号可以被组合使用。

      let temp_app = this;
      // 替换掉空格，并且在每个字符的前面加 % ，字符串最后再加上 % 。例如：把'hello world' 修改成：%h%e%l%l%o%w%o%r%l%d%
      let temp_file_search_text = this.file_search_text
        .replace(/\s+/g, "")
        .replace(/((?=.)|$)/g, "%");

      let group_id = temp_app.current_group_id;

      let query =
        "SELECT * FROM files WHERE group_id='" +
        group_id +
        "' AND  title like '" +
        temp_file_search_text +
        "'";
      if (group_id == "所有文件") {
        query =
          "SELECT * FROM files WHERE title like '" +
          temp_file_search_text +
          "'";
      }
      // return
      database.all(query, function (err, files) {
        if (err) {
          throw err;
        } else {
          temp_app.current_file_list = files;
        }
      });
    },
    rename: function (event, id, type, index) {
      var element = event.target;
      var oldhtml = element.innerHTML;
      //如果已经双击过，内容已经存在input，不做任何操作
      if (oldhtml.indexOf('type="text"') > 0) {
        return;
      }
      //创建新的input元素
      var newobj = document.createElement("input");
      //为新增元素添加类型
      newobj.type = "text";
      newobj.style.width = "90%";
      //为新增元素添加value值
      newobj.value = oldhtml.trim();
      newobj.id = "temp_rename_input";

      //设置该标签的子节点为空
      // element.innerHTML = '';
      //添加该标签的子节点，input对象
      element.appendChild(newobj);
      //设置选择文本的内容或设置光标位置（两个参数：start,end；start为开始位置，end为结束位置；如果开始位置和结束位置相同则就是光标位置）
      newobj.setSelectionRange(0, oldhtml.length);
      //设置获得光标
      newobj.focus();

      let is_rename = true;
      var temp_app = this;
      //为新增元素添加光标离开事件
      newobj.onblur = function () {
        console.log(this.value, oldhtml);
        //当触发时判断新增元素值是否为空，为空则不修改，并返回原有值
        if (this.value && this.value.trim() !== "" && is_rename) {
          // element.innerHTML = this.value == oldhtml ? oldhtml : this.value;
          // element.title = this.value == oldhtml ? oldhtml : this.value;

          // 更新科目title
          if (type == "subjects") {
            temp_app.current_subject.name =
              this.value == oldhtml ? oldhtml : this.value;

            let title = this.value == oldhtml ? oldhtml : this.value;
            temp_app.current_subject_name = title;
            temp_app.current_subject_list[index].title = title;
            document.getElementById("temp_rename_input").remove();

            database.run(
              "UPDATE subjects SET title = ? WHERE id = ?",
              [this.value, id],
              function (err) {
                if (err) {
                  throw err;
                } else {
                  temp_app.show_notification(
                    `科目名称修改<span style="color:#fff;font-weight:bold">成功</span>`
                  );
                }
              }
            );
            // 更新分组title
          } else if (type == "groups") {
            let title = this.value == oldhtml ? oldhtml : this.value;
            temp_app.current_group_name = title;
            temp_app.current_group_list[index].title = title;
            document.getElementById("temp_rename_input").remove();

            temp_app.current_group_name =
              this.value == oldhtml ? oldhtml : this.value;
            database.run(
              "UPDATE groups SET title = ? WHERE id = ?",
              [this.value, id],
              function (err) {
                if (err) {
                  throw err;
                } else {
                  temp_app.show_notification(
                    `分组名称修改<span style="color:#fff;font-weight:bold">成功</span>`
                  );
                }
              }
            );

            // 更新文件
          } else if (type == "files") {
            let title = this.value == oldhtml ? oldhtml : this.value;
            temp_app.current_file_name = title;
            temp_app.current_file_list[index].title = title;
            document.getElementById("temp_rename_input").remove();

            database.run(
              "UPDATE files SET title = ? WHERE id = ?",
              [this.value, id],
              function (err) {
                if (err) {
                  throw err;
                } else {
                  temp_app.show_notification(
                    `文件名称修改<span style="color:#fff;font-weight:bold">成功</span>`
                  );
                }
              }
            );
          }
        } else {
          // element.innerHTML = oldhtml;
        }
      };
      newobj.onkeyup = function (event) {
        if (event.key == "Enter") {
          newobj.blur();
        } else if (event.key == "Escape") {
          is_rename = false;
          document.getElementById("temp_rename_input").remove();
          // newobj.blur()
        }
      };
    },
    update_database_subject: function (property, value, id, callback) {
      let temp_app = this;
      database.run(
        "UPDATE subjects SET " + property + " = ? WHERE id = ?",
        [value, id],
        function (err) {
          if (err) {
            throw err;
          } else {
            temp_app.show_notification(
              `${property}的值已更新为： <span style="color:#fff;font-weight:bold">${value} </span>`
            );
            if (typeof callback == "function") {
              callback();
            }
          }
        }
      );
    },
    update_database_group: function (property, value, id, callback) {
      let temp_app = this;
      database.run(
        "UPDATE groups SET " + property + " = ? WHERE id = ?",
        [value, id],
        function (err) {
          if (err) {
            throw err;
          } else {
            temp_app.show_notification(
              `${property}的值已更新为： <span style="color:#fff;font-weight:bold">${value} </span>`
            );
            if (typeof callback == "function") {
              callback();
            }
          }
        }
      );
    },
    update_database_file: function (property, value, id, callback) {
      let temp_app = this;
      database.run(
        "UPDATE files SET " + property + " = ? WHERE id = ?",
        [value, id],
        function (err) {
          if (err) {
            throw err;
          } else {
            temp_app.show_notification(
              `${property}的值已更新为： <span style="color:#fff;font-weight:bold">${value} </span>`
            );
            if (typeof callback == "function") {
              callback();
            }
          }
        }
      );
    },
    // 更新配置
    update_database_property: function (property, value) {
      database.run(
        "UPDATE configs SET value = ? WHERE property = ?",
        [value, property],
        function (err) {
          if (err) {
            throw err;
          }
        }
      );
    },
    // 格式化日期
    date_format: function (fmt, date) {
      let ret;
      const opt = {
        "Y+": date.getFullYear().toString(), // 年
        "m+": (date.getMonth() + 1).toString(), // 月
        "d+": date.getDate().toString(), // 日
        "H+": date.getHours().toString(), // 时
        "M+": date.getMinutes().toString(), // 分
        "S+": date.getSeconds().toString(), // 秒
        // 有其他格式化字符需求可以继续添加，必须转化成字符串
      };
      for (let k in opt) {
        ret = new RegExp("(" + k + ")").exec(fmt);
        if (ret) {
          fmt = fmt.replace(
            ret[1],
            ret[1].length == 1 ? opt[k] : opt[k].padStart(ret[1].length, "0")
          );
        }
      }
      return fmt;
    },

    get_config: function (property) {
      return new Promise((resolve, rejects) => {
        database.all(
          "select * from configs WHERE property = '" + property + "'",
          function (err, configs) {
            if (err) {
              throw err;
            } else {
              resolve(configs[0].value);
            }
          }
        );
      });
    },

    update_config: function (property, value) {
      database.run(
        "UPDATE configs SET value = ? WHERE property = ?",
        [value, property],
        function (err) {
          if (err) {
            throw err;
          }
        }
      );
    },
    new_subject: async function (mode) {
      var subject_id = this.random_str("subject_id");
      var subject_title = "新科目";
      var date = this.date_format("YYYY年mm月dd日 HH:MM:SS", new Date());
      var stmt = database.prepare("INSERT INTO subjects VALUES(?,?,?,?,?)");

      let sort_num = await this.get_config("max_sort_num_subject");
      this.update_config("max_sort_num_subject", sort_num + 1);

      stmt.run(subject_id, subject_title, date, date, sort_num);

      this.change_subject(subject_id, subject_title);
      var temp_app = this;
      // 获取所有分组
      database.all(
        "select * from subjects order by sort_num ASC",
        function (err, subjects) {
          if (err) {
            throw err;
          } else {
            // 排序 - 按时间
            // subjects = temp_app.sort_group(subjects)
            temp_app.current_subject_list = subjects;
          }
        }
      );
      this.show_notification(
        `已新建项目: <span style="color:#fff;font-weight:bold">${subject_title} </span>`
      );
    },

    new_file: async function () {
      var file_id = this.random_str("file_id");
      var file_title = "新文件";
      var date = this.date_format("YYYY年mm月dd日 HH:MM:SS", new Date());
      // var date = new Date()
      var stmt = database.prepare(
        "INSERT INTO files VALUES(?,?,?,?,?,?,?,?,?,?)"
      );
      let sort_num = await this.get_config("max_sort_num_file");
      this.update_config("max_sort_num_file", sort_num + 1);
      stmt.run(
        file_id,
        this.current_group_id,
        file_title,
        date,
        date,
        "",
        "中文模式",
        1,
        null,
        sort_num
      );
      var temp_app = this;
      // 获取分组文件
      var query = `select * from files where group_id='${this.current_group_id}' order by sort_num ASC `;
      database.all(query, function (err, files) {
        if (err) {
          throw err;
        } else {
          // files = temp_app.sort_group(files)
          temp_app.current_file_list = files;
          temp_app.change_file(file_id, file_title);
        }
      });
      this.show_notification(
        `已新建文件: <span style="color:#fff;font-weight:bold">${file_title} </span>`
      );
    },

    new_group: async function (mode) {
      var group_id = this.random_str("group_id");
      var group_title = "新分组";
      var date = this.date_format("YYYY年mm月dd日 HH:MM:SS", new Date());
      var subject_id = this.current_subject.id;
      var stmt = database.prepare("INSERT INTO groups VALUES(?,?,?,?,?,?)");
      let sort_num = await this.get_config("max_sort_num_group");
      this.update_config("max_sort_num_group", sort_num + 1);
      stmt.run(group_id, group_title, date, date, subject_id, sort_num);

      this.change_group(group_id, group_title);
      var temp_app = this;
      // 获取所有分组
      database.all(
        `select * from groups where subject_id='${subject_id}' order by sort_num ASC`,
        function (err, groups) {
          if (err) {
            throw err;
          } else {
            // 排序 - 按时间
            // groups = temp_app.sort_group(groups)
            temp_app.current_group_list = groups;
          }
        }
      );
      this.show_notification(
        `已新建分组: <span style="color:#fff;font-weight:bold">${group_title} </span>`
      );
    },

    // 未完成
    delete_file(file_id) {
      var is_confirm = window.confirm(
        "确定要删除科目【 " +
          this.current_subject.title +
          "】吗？科目里面的分组也会一并删除的哦！"
      );
    },
    // 未完成
    delete_subject(subject_id) {
      var is_confirm = window.confirm(
        "确定要删除科目【 " +
          this.current_subject.title +
          "】吗？科目里面的分组也会一并删除的哦！"
      );
      if (is_confirm) {
        // 删除分组内的文件
        database.run(
          "DELETE from groups where subject_id=?",
          [temp_app.current_subject.id],
          function (err) {
            if (err) {
              throw err;
            } else {
              // 删除分组
              database.run(
                "DELETE from subjects where id=?",
                [temp_app.current_subject.id],
                function (err) {
                  if (err) {
                    throw err;
                  } else {
                    temp_app.show_notification(
                      `删除科目： <span style="color:#fff;font-weight:bold">${temp_app.current_subject.title} </span>`
                    );
                    // 刷新列表
                    temp_app.init_data();
                  }
                }
              );
            }
          }
        );
      }
    },
    delete_current_subject: function () {
      // var is_confirm = window.confirm("确定要删除当前分组吗？")
      var is_confirm = window.confirm(
        "确定要删除科目【 " +
          this.current_subject.title +
          "】吗？科目里面的分组也会一并删除的哦！"
      );
      if (is_confirm) {
        var temp_app = this;
        // 删除分组内的文件
        database.run(
          "DELETE from groups where subject_id=?",
          [temp_app.current_subject.id],
          function (err) {
            if (err) {
              throw err;
            } else {
              // 删除分组
              database.run(
                "DELETE from subjects where id=?",
                [temp_app.current_subject.id],
                function (err) {
                  if (err) {
                    throw err;
                  } else {
                    temp_app.show_notification(
                      `删除科目： <span style="color:#fff;font-weight:bold">${temp_app.current_subject.title} </span>`
                    );
                    // 刷新列表
                    temp_app.init_data();
                  }
                }
              );
            }
          }
        );
      }
    },
    delete_current_file: function () {
      // var is_confirm = window.confirm("确定要删除当前文件吗？")
      var is_confirm = window.confirm(
        "确定要删除文件【 " + this.current_file_name + "】吗？"
      );
      if (is_confirm) {
        var temp_app = this;
        database.run(
          "DELETE from files where ID=?",
          [temp_app.current_file_id],
          function (err) {
            if (err) {
              throw err;
            } else {
              // 获取分组文件
              var query =
                "select * from files where group_id='" +
                temp_app.current_group_id +
                "'";
              database.all(query, function (err, files) {
                if (err) {
                  throw err;
                } else {
                  temp_app.current_file_list = files;
                  temp_app.show_notification(
                    `删除文件： <span style="color:#fff;font-weight:bold">${temp_app.current_file_name} </span>`
                  );
                }
              });
            }
          }
        );
      }
    },
    delete_current_group: function () {
      // var is_confirm = window.confirm("确定要删除当前分组吗？")
      var is_confirm = window.confirm(
        "确定要删除分组【 " + this.current_group_name + "】吗？"
      );
      if (is_confirm) {
        var temp_app = this;
        // 删除分组内的文件
        database.run(
          "DELETE from files where group_id=?",
          [temp_app.current_group_id],
          function (err) {
            if (err) {
              throw err;
            } else {
              // 删除分组
              database.run(
                "DELETE from groups where id=?",
                [temp_app.current_group_id],
                function (err) {
                  if (err) {
                    throw err;
                  } else {
                    temp_app.show_notification(
                      `删除分组： <span style="color:#fff;font-weight:bold">${temp_app.current_group_name} </span>`
                    );
                    // 刷新列表
                    temp_app.init_data();
                  }
                }
              );
            }
          }
        );
      }
    },
    // 编辑内容
    edit_content: function () {
      this.handle_text("source");
      this.is_contenteditable = true;
    },
    save_file: function () {
      var temp_app = this;
      var temp = document.querySelector(".content").innerText;
      var update_date = this.date_format("YYYY年mm月dd日 HH:MM:SS", new Date());

      this.set_content(temp, "save");

      // database.run("UPDATE files SET content = ? WHERE id = ?", [temp_app.source_content, temp_app.current_file_id], function (err) {
      database.run(
        "UPDATE files SET content = ? , update_date=? WHERE id = ?",
        [temp_app.source_content, update_date, temp_app.current_file_id],
        function (err) {
          if (err) {
            throw err;
          } else {
            // 获取分组文件
            var query =
              "select * from files where group_id='" +
              temp_app.current_group_id +
              "'";
            database.all(query, function (err, files) {
              if (err) {
                throw err;
              } else {
                temp_app.current_file_list = files;
                temp_app.show_notification(
                  `文件： <span style="color:#fff;font-weight:bold">${temp_app.current_file_name} </span>已保存`
                );
              }
            });
          }
        }
      );
    },

    // database_saveas: function () {

    // },
    // backup_database: function () {
    //     var temp_app = this
    //     fs.copyFile("./data/default_datebase.db", `./data/backup/default_datebase-${this.random_str('backup')}.db`, function (err) {
    //         if (err) {
    //             throw err
    //         } else {
    //             temp_app.show_notification(`备份数据库: <span style="color:#fff;font-weight:bold">${"成功"} </span>`)
    //         }
    //     })
    // },
    get_backup_database: function () {
      let dir_path = path.join(__dirname, "/data/backup");
      this.backup_database_list = fs.readdirSync(dir_path);
      // console.log(backup_database_list)
    },
    update_property: function (property, value) {
      database.run(
        "UPDATE configs SET value = ? WHERE property = ?",
        [value, property],
        function (err) {
          if (err) {
            throw err;
          }
        }
      );
    },
    get_property: function (property) {
      let value = "";
      database.all(
        "select * from configs WHERE property = '" + property + "'",
        function (err, values) {
          if (err) {
            throw err;
          } else {
            // console.log(values)
            value = values[0];
          }
        }
      );
      return value;
    },
    change_font_size: function (type) {
      switch (type) {
        case "+":
          this.style_content.fontSize =
            parseFloat(this.style_content.fontSize) + 1 + "px";

          // 更新到数据库
          this.update_property(
            "content_font_size",
            this.style_content.fontSize
          );
          this.show_notification(
            `字体大小修改为: <span style="color:#fff;font-weight:bold">${this.style_content.fontSize} </span>`
          );
          break;
        case "-":
          this.style_content.fontSize =
            parseFloat(this.style_content.fontSize) - 1 + "px";

          // 更新到数据库
          this.update_property(
            "content_font_size",
            this.style_content.fontSize
          );
          this.show_notification(
            `字体大小修改为: <span style="color:#fff;font-weight:bold">${this.style_content.fontSize} </span>`
          );
          break;
        case "default":
          this.style_content.fontSize = "15px";

          // 更新到数据库
          this.update_property(
            "content_font_size",
            this.style_content.fontSize
          );
          this.show_notification(
            `字体大小修改为: <span style="color:#fff;font-weight:bold">${this.style_content.fontSize} </span>`
          );
          break;
      }
    },
    change_line_height: function (type) {
      switch (type) {
        case "+":
          this.style_content.lineHeight =
            parseFloat(this.style_content.lineHeight) + 1 + "px";

          // 更新到数据库
          this.update_property(
            "content_line_height",
            this.style_content.lineHeight
          );
          this.show_notification(
            `行高修改为: <span style="color:#fff;font-weight:bold">${this.style_content.lineHeight} </span>`
          );
          break;
        case "-":
          this.style_content.lineHeight =
            parseFloat(this.style_content.lineHeight) - 1 + "px";

          // 更新到数据库
          this.update_property(
            "content_font_size",
            this.style_content.fontSize
          );
          this.update_property(
            "content_line_height",
            this.style_content.lineHeight
          );
          this.show_notification(
            `行高修改为: <span style="color:#fff;font-weight:bold">${this.style_content.lineHeight} </span>`
          );
          break;
        case "default":
          this.style_content.lineHeight = "25px";

          // 更新到数据库
          this.update_property(
            "content_line_height",
            this.style_content.lineHeight
          );
          this.show_notification(
            `行高修改为: <span style="color:#fff;font-weight:bold">${this.style_content.lineHeight} </span>`
          );
          break;
      }
    },
    // 显示快捷键
    show_shortcutkey: function () {
      var key =
        "新建分组：ctrl+g \n新建文件：ctrl+n \n删除分组：ctrl+alt+d \n删除文件：ctrl+d \n保存文件：ctrl+s \n源文本：` \n模板一：1 \n模板二：2 \n模板三：3 \n模板四：4 \n中文模式：ctrl+5 \n英文模式：ctrl+6 \n日文模式：ctrl+7 \n备份数据库：ctrl+b \n增大字号：ctrl+alt+= \n减少字号：ctrl+alt+- \n默认字号：ctrl+alt+0 \n护眼：ctrl+e \n组置顶：ctrl+t";
      alert(key);
    },
    switch_language_mode: function (mode) {
      this.language_mode = mode;
      var temp_app = this;
      // database.run("update files ")
      database.run(
        "UPDATE files SET language_mode = ? WHERE id = ?",
        [mode, this.current_file_id],
        function (err) {
          if (err) {
            throw err;
          } else {
            temp_app.show_notification(
              `文件模式修改为：<span style="color:#fff;font-weight:bold">${mode}</span>`
            );
          }
        }
      );
    },
    toggle_content_style: function (property) {
      if (property == "fontWeight") {
        if (this.style_content.fontWeight == "normal") {
          this.style_content.fontWeight = "bold";
        } else {
          this.style_content.fontWeight = "normal";
        }
      }
    },
    toggle_green_mode: function () {
      var bg_color = "";
      // 切换到默认模式
      if (this.is_green_mode) {
        // bg_color = "#F1F4FB"
        bg_color = "#fff";
        this.theme.backgroundColor = bg_color;
        this.green_mode_btn_value = "护眼(关)";
        this.is_green_mode = !this.is_green_mode;
        // this.theme.color = "#333"

        // 修改隐藏文字的颜色
        document.querySelectorAll(".hidden_text").forEach((ele) => {
          ele.style.color = bg_color;
        });
        // 切换到护眼模式
      } else {
        // bg_color = "#C7EDCC"
        // 护眼背景颜色
        bg_color = "#acdeb3";
        // bg_color = "#a2deaa"
        this.theme.backgroundColor = bg_color;
        this.green_mode_btn_value = "护眼(开)";
        this.is_green_mode = !this.is_green_mode;
        // 修改隐藏文字的颜色
        document.querySelectorAll(".hidden_text").forEach((ele) => {
          // ele.style.color = this.theme.backgroundColor
          ele.style.color = bg_color;
        });
        // this.theme.color = "#333"
      }
      this.update_property("is_green_mode", this.is_green_mode);
      // this.change_file(this.current_file_id, this.current_file_name)
    },
    allowDrop: function (ev) {
      ev.preventDefault();
      // ev.target.parentNode.style.borderTop = "5px solid red"
    },

    drag: function (ev) {
      // var drag_id = ev.target.attributes.drag_id.nodeValue
      var drap_type = ev.target.attributes.drap_type.nodeValue;
      var drap_index = ev.target.attributes.index.nodeValue;
      // ev.dataTransfer.setData("file_id", file_id);
      ev.dataTransfer.setData("drap_type", drap_type);
      ev.dataTransfer.setData("drap_index", drap_index);
      console.log("drap::", drap_type);
    },

    drop: async function (ev) {
      let temp_chmWriter = this;
      NodeEvent.on("file_range_updated_to_database", function () {
        temp_chmWriter.change_group(temp_chmWriter.current_group.id);
        NodeEvent.removeListener("file_range_updated_to_database", () => {});
      });

      var drap_type = ev.dataTransfer.getData("drap_type");
      var drop_type = ev.target.attributes.drop_type.nodeValue;
      var drap_index = ev.dataTransfer.getData("drap_index");
      var drop_index = ev.target.attributes.index.nodeValue;
      drap_index = parseInt(drap_index);
      drop_index = parseInt(drop_index);
      console.log(drap_type, drop_type);

      if (drap_type == drop_type) {
        // 章节拖拽排序
        if (drop_type == "file") {
          // 往下拖拽
          if (drap_index < drop_index) {
            let drap_index_sort_num =
              this.current_file_list[drap_index].sort_num;
            let drop_index_sort_num =
              this.current_file_list[drop_index].sort_num;
            for (let i = drap_index; i <= drop_index; i++) {
              if (i == drap_index) {
                await this.update_database_file(
                  "sort_num",
                  drop_index_sort_num,
                  this.current_file_list[i].id
                );
                // this.current_file_list[i].sort_num = drop_index_sort_num
              } else {
                await this.update_database_file(
                  "sort_num",
                  this.current_file_list[i - 1].sort_num,
                  this.current_file_list[i].id
                );
                // this.current_file_list[i].sort_num = this.current_file_list[i - 1].sort_num
                if (i == drop_index) {
                  setTimeout(() => {
                    NodeEvent.emit("file_range_updated_to_database");
                  }, 100);
                }
              }
            }

            // 往上拖拽
          } else if (drap_index > drop_index) {
            let drap_index_sort_num =
              this.current_file_list[drap_index].sort_num;
            let drop_index_sort_num =
              this.current_file_list[drop_index].sort_num;
            for (let i = drop_index; i <= drap_index; i++) {
              if (i == drap_index) {
                await this.update_database_file(
                  "sort_num",
                  drop_index_sort_num,
                  this.current_file_list[i].id
                );
                if (i == drap_index) {
                  setTimeout(() => {
                    NodeEvent.emit("file_range_updated_to_database");
                  }, 100);
                }
              } else {
                await this.update_database_file(
                  "sort_num",
                  this.current_file_list[i + 1].sort_num,
                  this.current_file_list[i].id
                );
              }
            }
          }
          // 分组拖拽排序
        } else if (drop_type == "group") {
          // 往下拖拽
          if (drap_index < drop_index) {
            let drap_index_sort_num =
              this.current_group_list[drap_index].sort_num;
            let drop_index_sort_num =
              this.current_group_list[drop_index].sort_num;
            for (let i = drap_index; i <= drop_index; i++) {
              if (i == drap_index) {
                await this.update_database_group(
                  "sort_num",
                  drop_index_sort_num,
                  this.current_group_list[i].id
                );
                // this.current_group_list[i].sort_num = drop_index_sort_num
              } else {
                await this.update_database_group(
                  "sort_num",
                  this.current_group_list[i - 1].sort_num,
                  this.current_group_list[i].id
                );
                // this.current_group_list[i].sort_num = this.current_group_list[i - 1].sort_num
                if (i == drop_index) {
                  setTimeout(() => {
                    database.all(
                      `select * from groups where subject_id='${temp_chmWriter.current_subject.id}' order by sort_num ASC`,
                      function (err, groups) {
                        if (err) {
                          throw err;
                        } else {
                          temp_chmWriter.current_group_list = groups;
                        }
                      }
                    );
                    // NodeEvent.emit('file_range_updated_to_database')
                  }, 100);
                }
              }
            }

            // 往上拖拽
          } else if (drap_index > drop_index) {
            let drap_index_sort_num =
              this.current_group_list[drap_index].sort_num;
            let drop_index_sort_num =
              this.current_group_list[drop_index].sort_num;
            for (let i = drop_index; i <= drap_index; i++) {
              if (i == drap_index) {
                await this.update_database_group(
                  "sort_num",
                  drop_index_sort_num,
                  this.current_group_list[i].id
                );
                if (i == drap_index) {
                  setTimeout(() => {
                    database.all(
                      `select * from groups where subject_id='${temp_chmWriter.current_subject.id}' order by sort_num ASC`,
                      function (err, groups) {
                        if (err) {
                          throw err;
                        } else {
                          temp_chmWriter.current_group_list = groups;
                        }
                      }
                    );
                    // NodeEvent.emit('file_range_updated_to_database')
                  }, 100);
                }
              } else {
                await this.update_database_group(
                  "sort_num",
                  this.current_group_list[i + 1].sort_num,
                  this.current_group_list[i].id
                );
              }
            }
          }
          // 科目拖拽排序
        } else if (drop_type == "subject") {
          // 往下拖拽
          if (drap_index < drop_index) {
            let drap_index_sort_num =
              this.current_subject_list[drap_index].sort_num;
            let drop_index_sort_num =
              this.current_subject_list[drop_index].sort_num;
            for (let i = drap_index; i <= drop_index; i++) {
              if (i == drap_index) {
                await this.update_database_subject(
                  "sort_num",
                  drop_index_sort_num,
                  this.current_subject_list[i].id
                );
                // this.current_group_list[i].sort_num = drop_index_sort_num
              } else {
                await this.update_database_subject(
                  "sort_num",
                  this.current_subject_list[i - 1].sort_num,
                  this.current_subject_list[i].id
                );
                // this.current_subject_list[i].sort_num = this.current_subject_list[i - 1].sort_num
                if (i == drop_index) {
                  setTimeout(() => {
                    database.all(
                      `select * from subjects order by sort_num ASC`,
                      function (err, subjects) {
                        if (err) {
                          throw err;
                        } else {
                          temp_chmWriter.current_subject_list = subjects;
                        }
                      }
                    );
                    // NodeEvent.emit('file_range_updated_to_database')
                  }, 100);
                }
              }
            }

            // 往上拖拽
          } else if (drap_index > drop_index) {
            let drap_index_sort_num =
              this.current_subject_list[drap_index].sort_num;
            let drop_index_sort_num =
              this.current_subject_list[drop_index].sort_num;
            for (let i = drop_index; i <= drap_index; i++) {
              if (i == drap_index) {
                await this.update_database_subject(
                  "sort_num",
                  drop_index_sort_num,
                  this.current_subject_list[i].id
                );
                if (i == drap_index) {
                  setTimeout(() => {
                    database.all(
                      `select * from subjects order by sort_num ASC`,
                      function (err, subjects) {
                        if (err) {
                          throw err;
                        } else {
                          temp_chmWriter.current_subject_list = subjects;
                        }
                      }
                    );
                    // NodeEvent.emit('file_range_updated_to_database')
                  }, 100);
                }
              } else {
                await this.update_database_subject(
                  "sort_num",
                  this.current_subject_list[i + 1].sort_num,
                  this.current_subject_list[i].id
                );
              }
            }
          }
        }
      } else {
        // 文件移动到分组
        if (drap_type == "file" && drop_type == "group") {
          await temp_chmWriter.update_database_file(
            "group_id",
            temp_chmWriter.current_group_list[drop_index].id,
            temp_chmWriter.current_file_list[drap_index].id
          );
          temp_chmWriter.show_notification(
            `<span style="color:#fff;font-weight:bold">${temp_chmWriter.current_file_list[drap_index].title} </span>移动成功`
          );
          temp_chmWriter.change_group(temp_chmWriter.current_group.id);
        } else if (drap_type == "group" && drop_type == "subject") {
          await temp_chmWriter.update_database_group(
            "subject_id",
            temp_chmWriter.current_subject_list[drop_index].id,
            temp_chmWriter.current_group_list[drap_index].id
          );
          temp_chmWriter.show_notification(
            `<span style="color:#fff;font-weight:bold">${temp_chmWriter.current_group_list[drap_index].title} </span>移动成功`
          );
          temp_chmWriter.change_subject(temp_chmWriter.current_subject.id);
        }
      }
    },
    reset_file_sort_num: function () {
      let temp_chmWriter = this;
      database.all(
        "select * from files order by sort_num  ASC",
        async (err, files) => {
          if (err) {
            throw err;
          } else {
            let res = await (async () => {
              return new Promise((resolve, reject) => {
                try {
                  files.forEach(async (file, index) => {
                    await temp_chmWriter.update_database_file(
                      "sort_num",
                      index,
                      file.id
                    );
                  });
                  resolve("章节排序索引重构成功");
                } catch (err) {
                  reject(err);
                }
              });
            })();
            temp_chmWriter.change_group(temp_chmWriter.current_group.id);
            alert(res);
            // temp_chmWriter.show_notification(`<span style="color:#fff;font-weight:bold">${res} </span>`)
          }
        }
      );
    },
    reset_group_sort_num: function () {
      let temp_chmWriter = this;
      database.all(
        "select * from groups order by sort_num  ASC",
        async (err, groups) => {
          if (err) {
            throw err;
          } else {
            let res = await (async () => {
              return new Promise((resolve, reject) => {
                try {
                  groups.forEach(async (group, index) => {
                    await temp_chmWriter.update_database_group(
                      "sort_num",
                      index,
                      group.id
                    );
                  });
                  resolve("分组排序索/重构成功");
                } catch (err) {
                  reject(err);
                }
              });
            })();
            temp_chmWriter.init_data();
            alert(res);
          }
        }
      );
    },
    reset_subject_sort_num: function () {
      let temp_chmWriter = this;
      database.all(
        "select * from subjects order by sort_num  ASC",
        async (err, subjects) => {
          if (err) {
            throw err;
          } else {
            let res = await (async () => {
              return new Promise((resolve, reject) => {
                try {
                  subjects.forEach(async (subject, index) => {
                    await temp_chmWriter.update_database_subject(
                      "sort_num",
                      index,
                      subject.id
                    );
                  });
                  resolve("科目排序索/重构成功");
                } catch (err) {
                  reject(err);
                }
              });
            })();
            temp_chmWriter.init_data();
            alert(res);
          }
        }
      );
    },
    drag_group: function (ev) {
      var group_id = ev.target.attributes.group_id.nodeValue;
      ev.dataTransfer.setData("group_id", group_id);
    },

    drop_from_group: function (ev) {
      var group_id = ev.dataTransfer.getData("group_id");
      var subject_id = ev.target.attributes.subject_id.nodeValue;
      var subject_title = ev.target.title;
      var temp_app = this;
      database.run(
        "UPDATE groups SET subject_id=? where id=?",
        [subject_id, group_id],
        function (err) {
          if (err) {
            throw err;
          } else {
            // 刷新分组
            var query =
              "select * from groups where subject_id='" +
              temp_app.current_subject.id +
              "'";
            database.all(query, function (err, groups) {
              if (err) {
                throw err;
              } else {
                temp_app.current_group_list = groups;
                // temp_app.show_notification(`删除文件： <span style="color:#fff;font-weight:bold">${temp_app.current_file_name} </span>`)
              }
            });
            temp_app.show_notification(
              `移动到科目: <span style="color:#fff;font-weight:bold">${subject_title} </span>成功`
            );
          }
        }
      );
    },
    show_regExp: function () {
      this.is_hidden_regExp = !this.is_hidden_regExp;
    },
    excute_regExp: function (mode) {
      var reg = "";
      var replace_text = this.regExp_replace_text;

      if (mode == undefined) {
        reg = new RegExp(this.regExp_source_text, "g");
        // 清除pdf的长句自动换的行
      } else if (mode == "pdf_line_break") {
        if (
          this.language_mode == "中文模式" ||
          this.language_mode == "日文模式"
        ) {
          reg = new RegExp("([^。？！])<br/>", "g");
          replace_text = "$1";
          // this.final_content = this.final_content.replace(reg, "$1")
          // return
        } else if (this.language_mode == "英文模式") {
          // reg = new RegExp("[^\,\.\!\?]&nbsp;\<br\/\>", "g")
          reg = new RegExp("([^.!?] )<br/>", "g");
          replace_text = "$1";
        }
        // 删除中括号及其里面的内容
      } else if (mode == "square_brackets") {
        reg = new RegExp("\\[[\\w\\W]+?\\]", "g");
        replace_text = "";

        // 删除括号及其里面的内容
      } else if (mode == "round_brackets") {
        reg = new RegExp("\\([\\w\\W]+?\\)", "g");
        replace_text = "";
        // 增加换行
      } else if (mode == "line_break") {
        reg = new RegExp("<br/>", "g");
        replace_text = "<br/><br/>";
      }
      this.final_content = this.final_content.replace(reg, replace_text);
      // 通讯
      // console.log(ipcRenderer.sendSync('get-message', 'ping'))
    },
    change_review_stage: function (stage) {
      // var date = this.date_format("YYYY年mm月dd日 HH:MM:SS", new Date());
      this.current_file.review_stage = stage;
      this.update_database_file("review_stage", stage, this.current_file_id);
      if (this.current_file.reference_date != null) {
        this.add_to_review_project();
      }
    },
    // 加入复习计划
    add_to_review_project: function () {
      var date = this.date_format("YYYY年mm月dd日 HH:MM:SS", new Date());
      this.update_database_file("reference_date", date, this.current_file_id);
      this.remaining_days =
        this.review_stage_list[this.current_file.review_stage] -
        this.current_date_interval.days +
        "天后复习";
    },
    // 从复习计划中移除
    remove_from_review_project: function () {
      // var date = this.date_format("YYYY年mm月dd日 HH:MM:SS", new Date());
      this.update_database_file("reference_date", null, this.current_file_id);
    },
    toggle_is_add_to_review_project: function (event) {
      if (this.is_add_to_review_project) {
        console.log("-------    ");
        this.add_to_review_project_btn_value = "加入复习";
        this.remaining_days = "未加入复习计划";
        // 从复习计划中移除
        this.update_database_file("reference_date", null, this.current_file_id);
      } else {
        console.log("++++++++");
        var date = this.date_format("YYYY年mm月dd日 HH:MM:SS", new Date());
        this.remaining_days =
          this.review_stage_list[this.current_file.review_stage] -
          this.current_date_interval.days +
          "天后复习";
        this.add_to_review_project_btn_value = "移除复习";
        // 加入复习计划
        this.update_database_file("reference_date", date, this.current_file_id);
      }
      this.is_add_to_review_project = !this.is_add_to_review_project;
    },
    new_database: function () {
      let save_path = ipcRenderer.sendSync(tool_key, "save");
      if (save_path != undefined) {
        //文件名含有非法字符()
        let template_database_path = path.join(
          __dirname,
          "/data/database_template/database_template.db"
        );
        // let user_database_path = path.join(__dirname, "/data/user_database/", name)
        fs.copyFileSync(template_database_path, save_path);
        this.current_database_path = save_path;
        this.open_database("path");
      }
    },
    open_database: function (type) {
      if (type == undefined) {
        let result = ipcRenderer.sendSync(tool_key, "open");
        if (result.canceled == true) {
          return;
        } else {
          this.connect_database(result.filePaths[0]);
        }
      } else if (type == "default") {
        this.connect_database();
      } else if (type == "path") {
        this.connect_database(this.current_database_path);
      }
      // this.is_change_group = true
      // this.is_change_file = true
      this.init_data();
      this.current_file_list = [];
      this.current_group_list = [];
    },
    /**
     * 显示右键菜单
     * @param {Object} event 右键点击事件
     * @param {String} selector 要显示的菜单的css选择器
     */
    show_contextmenu: function (event, type, item) {
      event.preventDefault();

      //   this.data.contextmenu_ev = event;

      let x = event.pageX;
      let y = event.pageY;

      // 如果鼠标指针的位置超过软件高度的一半的话，菜单就显示在指针上面
      let height = document.body.clientHeight;
      if (y > height / 2) {
        let my_div = document.getElementById("tool_contextmenu");
        let h = window.getComputedStyle(my_div, null).height;
        if (h != "auto") {
          y = y - parseInt(h);
        }
      }

      // 菜单外层
      this.style_contextmenu.display = "block";
      this.style_contextmenu.left = x + "px";
      this.style_contextmenu.top = y + "px";

      this.contextmenu_param.type = type;
      this.contextmenu_param.item = item;
    },
    hide_contextmenu: function () {
      this.style_contextmenu.display = "none";
    },
    app_command: function (command) {
      ipcRenderer.sendSync(tool_key, command);
      if (command == "win_always_on_top") {
        if (this.win_always_on_top) {
          this.show_notification("取消 置顶");
        } else {
          this.show_notification("窗口 置顶");
        }
        this.win_always_on_top = !this.win_always_on_top;
      }
    },
  },
});
