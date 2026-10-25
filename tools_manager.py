#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tools.json 管理工具 —— 不用手写 JSON，改完自动按合法格式写回。

用法：python tools_manager.py
用不到的字段不用管，脚本会保证逗号、引号、编码都不出错。
"""

import json
import os
import shutil
import sys
from pathlib import Path

# 让 Windows 控制台按 UTF-8 显示，免得中文变乱码
if os.name == 'nt':
    os.system('chcp 65001 >nul 2>nul')
    for stream in (sys.stdout, sys.stdin):
        try:
            stream.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass

BASE = Path(__file__).resolve().parent
JSON_PATH = BASE / 'tools.json'
BACKUP_PATH = BASE / 'tools.json.bak'

FIELDS = [
    ('title', '标题', '必填，例如：7-Zip'),
    ('desc', '简介', '必填，写多长都行，卡片上先显示三行，多余的收起'),
    ('image', '图片', '必填，本地图片写成 icon/tbtool.png，网图写 https:// 开头的地址'),
    ('url', '链接', '必填；写 https:// 开头的网址，点了会打开网页；写仓库里的文件（如 downloads/排队器.exe），点了会直接下载'),
]


def load():
    """读 tools.json；文件不存在或为空就当还没有工具"""
    if not JSON_PATH.exists():
        return []
    text = JSON_PATH.read_text(encoding='utf-8').strip()
    if not text:
        return []
    data = json.loads(text)
    if not isinstance(data, list):
        raise ValueError('最外层必须是 [ ... ] 这种数组')
    return data


def save(items):
    """写回 tools.json：先备份，再写 UTF-8、两空格缩进，格式一定合法"""
    if JSON_PATH.exists():
        shutil.copyfile(JSON_PATH, BACKUP_PATH)
    JSON_PATH.write_text(
        json.dumps(items, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8',
    )


def ask(label, tip, old=None):
    print('  ' + tip)
    if old is not None:
        print('  当前值：' + (old if old else '（空）'))
        print('  直接回车 = 不改；输入 - = 清空')
    value = input('  ' + label + '：').strip()
    if old is not None:
        if value == '':
            return old
        if value == '-':
            return ''
    return value


def fix_local_path(value, what):
    """反斜杠一律换成正斜杠；填的是仓库里的文件，就顺手看看文件在不在"""
    value = value.replace('\\', '/')
    if value.startswith('http://') or value.startswith('https://'):
        return value, None
    if not (BASE / value).exists():
        return value, '提示：站点目录里没有 %s，%s' % (value, what)
    return value, None


# 仓库内路径写错时的提醒语
WHAT = {'image': '这张图在网页上会显示不出来', 'url': '点下载会 404'}


def show(items):
    if not items:
        print('\n  目前一个工具都没有。\n')
        return
    print('\n  共 %d 个工具：' % len(items))
    for i, item in enumerate(items, 1):
        print('  %d) %s' % (i, item.get('title', '（无标题）')))
        print('     简介：%s' % (item.get('desc', '') or '（无）'))
        print('     图片：%s' % (item.get('image', '') or '（无）'))
        print('     链接：%s' % (item.get('url', '') or '（无）'))
    print()


def pick(items, verb):
    show(items)
    if not items:
        return None
    answer = input('  要%s第几个？（填序号，回车取消）：' % verb).strip()
    if not answer.isdigit() or not 1 <= int(answer) <= len(items):
        print('\n  序号不对，什么都没做。\n')
        return None
    return int(answer) - 1


def add(items):
    print('\n  --- 添加工具（任何一步输入 q 都可以放弃）---')
    item = {}
    for key, label, tip in FIELDS:
        value = ask(label, tip)
        if value.lower() == 'q':
            print('\n  已放弃，什么都没改。\n')
            return
        if not value:
            print('\n  %s不能为空，已放弃。\n' % label)
            return
        if key in WHAT:
            value, warn = fix_local_path(value, WHAT[key])
            if warn:
                print('  ' + warn)
        item[key] = value
    items.append(item)
    save(items)
    print('\n  已添加并保存：%s\n' % item['title'])


def edit(items):
    index = pick(items, '修改')
    if index is None:
        return
    item = items[index]
    print('\n  --- 修改「%s」---' % item.get('title', ''))
    for key, label, tip in FIELDS:
        value = ask(label, '留空回车 = 不改', item.get(key, ''))
        if key in WHAT:
            value, warn = fix_local_path(value, WHAT[key])
            if warn:
                print('  ' + warn)
        item[key] = value
    save(items)
    print('\n  已保存。\n')


def delete(items):
    index = pick(items, '删除')
    if index is None:
        return
    item = items[index]
    if input('  确定删除「%s」？（输入 y 确认）：' % item.get('title', '')).strip().lower() != 'y':
        print('\n  已取消。\n')
        return
    items.pop(index)
    save(items)
    print('\n  已删除。\n')


MENU = """
=====================================================
  工具列表管理（tools.json）
  文件：{path}
=====================================================
  1) 查看全部      2) 添加工具
  3) 修改工具      4) 删除工具
  5) 检查格式      0) 退出
  输入 help 查看详细说明
"""

HELP = """
-----------------------------------------------------
  命令说明
-----------------------------------------------------
  help / h / ?     显示这份说明
  1  查看全部      列出所有工具的四个字段
  2  添加工具      逐项填写，任何一步输入 q 放弃
  3  修改工具      先选序号；某字段留空回车 = 不改，输入 - = 清空
  4  删除工具      选序号后还要输入 y 确认
  5  检查格式      校验 tools.json 能否被网页正常读取
  0  退出

  字段怎么填
    标题    卡片上显示的名字
    简介    卡片上先显示三行，更长的收进「…展开」
    图片    仓库内写 icon/xxx.png；网图写 https:// 开头的地址
    链接    写 https:// 开头 → 按钮为「打开」，新标签打开网页
            写仓库内文件（如 downloads/xxx.exe）→ 按钮为「下载」，点了直接下载
            路径里的反斜杠会被自动换成正斜杠

  保存与备份
    每次写入前会把原文件存成 tools.json.bak
    万一 tools.json 被改坏，把 .bak 复制成 tools.json 即可还原
-----------------------------------------------------
"""


def main():
    print(MENU.format(path=JSON_PATH))
    while True:
        try:
            items = load()
        except Exception as exc:
            print('\n  tools.json 读不出来：%s' % exc)
            print('  可以手动改成合法 JSON；或者把 tools.json.bak 复制成 tools.json 还原上次内容。\n')
            input('  回车退出…')
            return

        answer = input('  请选择：').strip()
        if answer.lower() in ('help', 'h', '?', '？'):
            print(HELP)
            continue
        if answer == '0':
            print('\n  再见。')
            return
        if answer == '1':
            show(items)
        elif answer == '2':
            add(items)
        elif answer == '3':
            edit(items)
        elif answer == '4':
            delete(items)
        elif answer == '5':
            print('\n  格式没问题，%d 个工具都能正常读取。\n' % len(items))
        else:
            print('\n  没有这个选项。\n')


if __name__ == '__main__':
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print('\n  已中断。')
