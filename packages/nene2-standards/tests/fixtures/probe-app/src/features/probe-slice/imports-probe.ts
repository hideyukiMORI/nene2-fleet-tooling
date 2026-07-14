// 依存禁止リスト＋fsd 相対越境プローブ（features 位置 = *.css pattern 追加が
// paths 禁止群を潰し得た「重複定義が潰し得るレイヤ位置」— 05 §2.2.4 注記の現物）
import axios from 'axios';
import { create } from 'zustand';
import styled from 'styled-components';
import { css } from '@emotion/react';
import { helper } from '../../entities/user/lib/helper.ts';
import { Button } from '@/shared/ui';

export const importsProbe = [axios, create, styled, css, helper, Button];
