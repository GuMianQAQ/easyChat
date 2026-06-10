## ADDED Requirements

### Requirement: 图片预览组件增强

系统 SHALL 提供增强的图片预览组件，支持左右切换和索引显示。

#### Scenario: 组件接口设计

- **WHEN** 组件接收props
- **THEN** 组件接收以下属性：
  - `open`: boolean，控制预览是否显示
  - `images`: string[]，图片URL列表
  - `currentIndex`: number，当前显示的图片索引
  - `onClose`: () => void，关闭预览的回调
  - `onIndexChange`: (index: number) => void，索引变化的回调

#### Scenario: 图片显示

- **WHEN** 组件打开
- **THEN** 系统显示当前索引对应的图片，居中显示，自适应容器大小
- **WHEN** 图片加载中
- **THEN** 系统显示加载指示器

#### Scenario: 左右切换

- **WHEN** 用户点击左箭头按钮
- **THEN** 系统调用onIndexChange回调，传入currentIndex - 1
- **WHEN** 用户点击右箭头按钮
- **THEN** 系统调用onIndexChange回调，传入currentIndex + 1
- **WHEN** currentIndex为0
- **THEN** 系统隐藏左箭头按钮
- **WHEN** currentIndex为images.length - 1
- **THEN** 系统隐藏右箭头按钮

#### Scenario: 索引显示

- **WHEN** 组件打开
- **THEN** 系统在底部显示当前图片索引，格式为"currentIndex + 1 / images.length"

#### Scenario: 关闭预览

- **WHEN** 用户点击关闭按钮
- **THEN** 系统调用onClose回调
- **WHEN** 用户点击遮罩层
- **THEN** 系统调用onClose回调
- **WHEN** 用户按Escape键
- **THEN** 系统调用onClose回调

### Requirement: 图片预览样式

系统 SHALL 提供美观的图片预览样式。

#### Scenario: 遮罩层样式

- **WHEN** 组件打开
- **THEN** 系统显示半透明黑色遮罩层，覆盖整个视口
- **WHEN** 用户点击遮罩层
- **THEN** 系统关闭预览

#### Scenario: 图片容器样式

- **WHEN** 组件打开
- **THEN** 系统显示白色圆角容器，居中显示，最大宽度90vw，最大高度90vh
- **WHEN** 图片尺寸超过容器
- **THEN** 系统自动缩放图片，保持宽高比

#### Scenario: 控制按钮样式

- **WHEN** 组件打开
- **THEN** 系统显示左右箭头按钮，位于图片两侧，半透明背景
- **WHEN** 用户hover箭头按钮
- **THEN** 系统显示不透明背景
- **WHEN** 箭头按钮禁用（第一张或最后一张）
- **THEN** 系统隐藏箭头按钮

#### Scenario: 索引显示样式

- **WHEN** 组件打开
- **THEN** 系统在底部居中显示索引，白色文字，半透明黑色背景
- **WHEN** 只有一张图片
- **THEN** 系统隐藏索引显示

### Requirement: 图片预览交互

系统 SHALL 提供流畅的图片预览交互体验。

#### Scenario: 键盘导航

- **WHEN** 用户按左箭头键
- **THEN** 系统显示上一张图片
- **WHEN** 用户按右箭头键
- **THEN** 系统显示下一张图片
- **WHEN** 用户按Escape键
- **THEN** 系统关闭预览

#### Scenario: 触摸支持

- **WHEN** 用户在触摸设备上向左滑动
- **THEN** 系统显示下一张图片
- **WHEN** 用户在触摸设备上向右滑动
- **THEN** 系统显示上一张图片

#### Scenario: 动画效果

- **WHEN** 用户切换图片
- **THEN** 系统显示平滑的淡入淡出动画
- **WHEN** 用户打开或关闭预览
- **THEN** 系统显示缩放动画
