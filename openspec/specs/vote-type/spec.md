## Purpose

Describe the vote type selection behavior, including single/multi-choice modes, type display, and create form settings/option cards.

## Requirements

### Requirement: Vote type selection
群投票 SHALL 支持投票类型选择，包括单选和多选两种模式。

#### Scenario: Create single-choice vote
- **WHEN** 用户选择"单选"类型创建投票
- **THEN** 系统创建投票，AllowMulti 为 false，VoteType 为 "single"

#### Scenario: Create multi-choice vote
- **WHEN** 用户选择"多选"类型创建投票
- **THEN** 系统创建投票，AllowMulti 为 true，VoteType 为 "multi"

### Requirement: Vote type display
群投票详情 SHALL 显示投票类型，让参与者知道是否可以多选。

#### Scenario: Display single-choice vote
- **WHEN** 用户查看单选投票
- **THEN** 显示"单选"标识

#### Scenario: Display multi-choice vote
- **WHEN** 用户查看多选投票
- **THEN** 显示"多选"标识

### Requirement: Vote create form settings
群投票创建表单 SHALL 将设置项分组显示，并为每个设置提供说明文字。

#### Scenario: Settings grouped with descriptions
- **WHEN** 用户查看投票创建表单
- **THEN** 设置项（匿名投票、截止时间）分组显示，每个设置有说明文字

### Requirement: Vote create form option cards
群投票创建表单 SHALL 使用卡片式布局展示选项，每个选项有独立边框。

#### Scenario: Options displayed as cards
- **WHEN** 用户查看投票创建表单的选项区域
- **THEN** 每个选项显示在独立的卡片中，有边框和内边距
