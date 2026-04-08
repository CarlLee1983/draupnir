/**
 * 基礎值對象 - 不可變的領域概念
 *
 * 值對象的特性：
 * - 無 ID，由其屬性值定義
 * - 不可變 (Immutable)
 * - 相等性基於值，不是引用
 */

export abstract class ValueObject {
	/**
	 * 比較兩個值對象是否相等
	 * 子類應覆蓋此方法，比較其所有屬性
	 */
	abstract equals(other: ValueObject): boolean

	/**
	 * 值對象的字符串表示
	 */
	abstract toString(): string
}
