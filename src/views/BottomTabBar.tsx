import { MissingIcon } from '@react-navigation/elements';
import {
  CommonActions,
  NavigationContext,
  NavigationHelpers,
  NavigationRouteContext,
  ParamListBase,
  TabNavigationState,
  useLinkBuilder,
  useTheme,
} from '@react-navigation/native';
import React from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { EdgeInsets, useSafeAreaFrame } from 'react-native-safe-area-context';

import type {
  BottomTabBarProps,
  BottomTabDescriptorMap,
  BottomTabNavigationEventMap,
  BottomTabNavigationOptions,
} from '../types';
import BottomTabBarHeightCallbackContext from '../utils/BottomTabBarHeightCallbackContext';
import useIsKeyboardShown from '../utils/useIsKeyboardShown';
import BottomTabItem from './BottomTabItem';

type Props = BottomTabBarProps & {
  style?: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
};

const DEFAULT_TABBAR_HEIGHT = 49;
const COMPACT_TABBAR_HEIGHT = 32;
const DEFAULT_MAX_TAB_ITEM_WIDTH = 125;

const useNativeDriver = Platform.OS !== 'web';

const chunkArray = (array: any[], chunkSize: number) => {
  return array.reduce((result, item, index) => {
    const chunkIndex = Math.floor(index / chunkSize);

    if (!result[chunkIndex]) {
      result[chunkIndex] = []; // start a new chunk
    }

    result[chunkIndex].push(item);

    return result;
  }, []);
};

type Options = {
  state: TabNavigationState<ParamListBase>;
  descriptors: BottomTabDescriptorMap;
  layout: { height: number; width: number };
  dimensions: { height: number; width: number };
};

const shouldUseHorizontalLabels = ({
  state,
  descriptors,
  layout,
  dimensions,
}: Options) => {
  const { tabBarLabelPosition } =
    descriptors[state.routes[state.index].key].options;

  if (tabBarLabelPosition) {
    switch (tabBarLabelPosition) {
      case 'beside-icon':
        return true;
      case 'below-icon':
        return false;
    }
  }

  if (layout.width >= 768) {
    // Screen size matches a tablet
    const maxTabWidth = state.routes.reduce((acc, route) => {
      const { tabBarItemStyle } = descriptors[route.key].options;
      const flattenedStyle = StyleSheet.flatten(tabBarItemStyle);

      if (flattenedStyle) {
        if (typeof flattenedStyle.width === 'number') {
          return acc + flattenedStyle.width;
        } else if (typeof flattenedStyle.maxWidth === 'number') {
          return acc + flattenedStyle.maxWidth;
        }
      }

      return acc + DEFAULT_MAX_TAB_ITEM_WIDTH;
    }, 0);

    return maxTabWidth <= layout.width;
  } else {
    return dimensions.width > dimensions.height;
  }
};

const getPaddingBottom = (insets: EdgeInsets) =>
  Math.max(insets.bottom - Platform.select({ ios: 4, default: 0 }), 0);

export const getTabBarHeight = ({
  state,
  descriptors,
  dimensions,
  insets,
  style,
  ...rest
}: Options & {
  insets: EdgeInsets;
  style: Animated.WithAnimatedValue<StyleProp<ViewStyle>> | undefined;
}) => {
  // @ts-ignore
  const customHeight = StyleSheet.flatten(style)?.height;

  if (typeof customHeight === 'number') {
    return customHeight;
  }

  const isLandscape = dimensions.width > dimensions.height;
  const horizontalLabels = shouldUseHorizontalLabels({
    state,
    descriptors,
    dimensions,
    ...rest,
  });
  const paddingBottom = getPaddingBottom(insets);

  if (
    Platform.OS === 'ios' &&
    !Platform.isPad &&
    isLandscape &&
    horizontalLabels
  ) {
    return COMPACT_TABBAR_HEIGHT + paddingBottom;
  }

  return DEFAULT_TABBAR_HEIGHT + paddingBottom;
};

export default function BottomTabBar({
  state,
  navigation,
  descriptors,
  insets,
  style,
  scrollEnabled,
  scrollViewProps,
  pagingIcons,
  tabCountPerPage = 4,
}: Props) {
  const { colors } = useTheme();

  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const focusedOptions = focusedDescriptor.options;

  const {
    tabBarHideOnKeyboard = false,
    tabBarVisibilityAnimationConfig,
    tabBarStyle,
    tabBarBackground,
  } = focusedOptions;

  const dimensions = useSafeAreaFrame();
  const isKeyboardShown = useIsKeyboardShown();

  const onHeightChange = React.useContext(BottomTabBarHeightCallbackContext);

  const shouldShowTabBar = !(tabBarHideOnKeyboard && isKeyboardShown);

  const visibilityAnimationConfigRef = React.useRef(
    tabBarVisibilityAnimationConfig
  );

  React.useEffect(() => {
    visibilityAnimationConfigRef.current = tabBarVisibilityAnimationConfig;
  });

  const pages = React.useMemo(() => {
    if (scrollEnabled) {
      return chunkArray(state.routes, tabCountPerPage);
    } else {
      return [];
    }
  }, [tabCountPerPage, scrollEnabled, state.routes]);

  const [isTabBarHidden, setIsTabBarHidden] = React.useState(!shouldShowTabBar);
  const [selectedPage, setSelectedPage] = React.useState<number>(0);
  const [visible] = React.useState(
    () => new Animated.Value(shouldShowTabBar ? 1 : 0)
  );

  React.useEffect(() => {
    const visibilityAnimationConfig = visibilityAnimationConfigRef.current;

    if (shouldShowTabBar) {
      const animation =
        visibilityAnimationConfig?.show?.animation === 'spring'
          ? Animated.spring
          : Animated.timing;

      animation(visible, {
        toValue: 1,
        useNativeDriver,
        duration: 250,
        ...visibilityAnimationConfig?.show?.config,
      }).start(({ finished }) => {
        if (finished) {
          setIsTabBarHidden(false);
        }
      });
    } else {
      setIsTabBarHidden(true);

      const animation =
        visibilityAnimationConfig?.hide?.animation === 'spring'
          ? Animated.spring
          : Animated.timing;

      animation(visible, {
        toValue: 0,
        useNativeDriver,
        duration: 200,
        ...visibilityAnimationConfig?.hide?.config,
      }).start();
    }

    return () => visible.stopAnimation();
  }, [visible, shouldShowTabBar]);

  const [layout, setLayout] = React.useState({
    height: 0,
    width: dimensions.width,
  });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { height, width } = e.nativeEvent.layout;

    onHeightChange?.(height);

    setLayout((layout) => {
      if (height === layout.height && width === layout.width) {
        return layout;
      } else {
        return {
          height,
          width,
        };
      }
    });
  };

  const paddingBottom = getPaddingBottom(insets);
  const tabBarHeight = getTabBarHeight({
    state,
    descriptors,
    insets,
    dimensions,
    layout,
    style: [tabBarStyle, style],
  });

  const tabBarBackgroundElement = tabBarBackground?.();

  return (
    <Animated.View
      style={[
        styles.tabBar,
        {
          backgroundColor:
            tabBarBackgroundElement != null ? 'transparent' : colors.card,
          borderTopColor: colors.border,
        },
        {
          transform: [
            {
              translateY: visible.interpolate({
                inputRange: [0, 1],
                outputRange: [
                  layout.height + paddingBottom + StyleSheet.hairlineWidth,
                  0,
                ],
              }),
            },
          ],
          // Absolutely position the tab bar so that the content is below it
          // This is needed to avoid gap at bottom when the tab bar is hidden
          position: isTabBarHidden ? 'absolute' : (null as any),
        },
        {
          height: tabBarHeight,
          paddingBottom,
          paddingHorizontal: Math.max(insets.left, insets.right),
        },
        tabBarStyle,
      ]}
      pointerEvents={isTabBarHidden ? 'none' : 'auto'}
      onLayout={handleLayout}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {tabBarBackgroundElement}
      </View>
      {scrollEnabled ? (
        <View style={styles.content}>
          {(selectedPage <= 1 && pages?.[selectedPage + 1] && (
            <View style={styles.rightIcon}>{pagingIcons?.right}</View>
          )) ||
            null}

          {(selectedPage >= 1 && (
            <View style={styles.leftIcon}>{pagingIcons?.left}</View>
          )) ||
            null}

          <ScrollView
            accessibilityRole="tablist"
            horizontal
            {...(pagingIcons
              ? {
                  onMomentumScrollEnd: ({ nativeEvent }) => {
                    const index = Math.round(
                      nativeEvent.contentOffset.x / layout.width
                    );

                    if (index !== selectedPage) {
                      setSelectedPage(index);
                    }
                  },
                }
              : undefined)}
            {...(scrollViewProps || {})}
          >
            <TabRoutes
              state={state}
              descriptors={descriptors}
              focusedOptions={focusedOptions}
              layout={layout}
              navigation={navigation}
              tabCountPerPage={tabCountPerPage}
            />
          </ScrollView>
        </View>
      ) : (
        <View style={styles.content}>
          <TabRoutes
            state={state}
            descriptors={descriptors}
            focusedOptions={focusedOptions}
            layout={layout}
            navigation={navigation}
          />
        </View>
      )}
    </Animated.View>
  );
}

interface ITabRoutesProps {
  state: TabNavigationState<ParamListBase>;
  descriptors: BottomTabDescriptorMap;
  focusedOptions: BottomTabNavigationOptions;
  layout: { height: number; width: number };
  navigation: NavigationHelpers<ParamListBase, BottomTabNavigationEventMap>;
  tabCountPerPage?: number;
}

const TabRoutes = ({
  state,
  descriptors,
  focusedOptions,
  layout,
  navigation,
  tabCountPerPage,
}: ITabRoutesProps): JSX.Element => {
  const dimensions = useSafeAreaFrame();
  const buildLink = useLinkBuilder();

  const { routes } = state;

  const {
    tabBarShowLabel,
    tabBarActiveTintColor,
    tabBarInactiveTintColor,
    tabBarActiveBackgroundColor,
    tabBarInactiveBackgroundColor,
  } = focusedOptions;

  const hasHorizontalLabels = shouldUseHorizontalLabels({
    state,
    descriptors,
    dimensions,
    layout,
  });

  return (
    <>
      {routes.map((route, index) => {
        const focused = index === state.index;
        const { options } = descriptors[route.key];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.dispatch({
              ...CommonActions.navigate({ name: route.name, merge: true }),
              target: state.key,
            });
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const accessibilityLabel =
          options.tabBarAccessibilityLabel !== undefined
            ? options.tabBarAccessibilityLabel
            : typeof label === 'string' && Platform.OS === 'ios'
            ? `${label}, tab, ${index + 1} of ${routes.length}`
            : undefined;

        return (
          <NavigationContext.Provider
            key={route.key}
            value={descriptors[route.key].navigation}
          >
            <NavigationRouteContext.Provider value={route}>
              <BottomTabItem
                width={dimensions.width}
                route={route}
                focused={focused}
                horizontal={hasHorizontalLabels}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityLabel={accessibilityLabel}
                to={buildLink(route.name, route.params)}
                testID={options.tabBarTestID}
                allowFontScaling={options.tabBarAllowFontScaling}
                activeTintColor={tabBarActiveTintColor}
                inactiveTintColor={tabBarInactiveTintColor}
                activeBackgroundColor={tabBarActiveBackgroundColor}
                inactiveBackgroundColor={tabBarInactiveBackgroundColor}
                button={options.tabBarButton}
                icon={
                  options.tabBarIcon ??
                  (({ color, size }) => (
                    <MissingIcon color={color} size={size} />
                  ))
                }
                badge={options.tabBarBadge}
                badgeStyle={options.tabBarBadgeStyle}
                label={label}
                showLabel={tabBarShowLabel}
                labelStyle={options.tabBarLabelStyle}
                iconStyle={options.tabBarIconStyle}
                tabCountPerPage={tabCountPerPage}
                style={options.tabBarItemStyle}
              />
            </NavigationRouteContext.Provider>
          </NavigationContext.Provider>
        );
      })}
    </>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 8,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  leftIcon: {
    position: 'absolute',
    zIndex: 9999,
    left: 0,
    height: '100%',
    justifyContent: 'center',
  },
  rightIcon: {
    position: 'absolute',
    zIndex: 9999,
    right: 0,
    justifyContent: 'center',
    height: '100%',
  },
});