import { type ParamListBase, type TabNavigationState } from '@react-navigation/native';
import type { BottomTabDescriptorMap, BottomTabNavigationConfig, BottomTabNavigationHelpers, ScrollableProps } from '../types';
type Props = BottomTabNavigationConfig & {
    state: TabNavigationState<ParamListBase>;
    navigation: BottomTabNavigationHelpers;
    descriptors: BottomTabDescriptorMap;
    scrollableProps?: ScrollableProps;
};
export declare function BottomTabView(props: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=BottomTabView.d.ts.map