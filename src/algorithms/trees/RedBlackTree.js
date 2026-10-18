import { TreeBase } from './TreeBase.js';
import { RedBlackNode } from './RedBlackNode.js';

const RED = 'red';
const BLACK = 'black';

/**
 * Red-Black Tree implementation with optional immutable operation snapshots.
 * Snapshots are only emitted for the visualizer; the tree itself remains the
 * normal mutable data structure.
 */
export class RedBlackTree extends TreeBase {
    constructor() {
        super('Red-Black Tree');
        this.nodeCount = 0;
        this.isAVL = false;
        this.isRedBlack = true;
    }

    _colorOf(node) {
        return node ? node.color : BLACK;
    }

    search(value) {
        return this.getNodeByData(value);
    }

    getSize() {
        return this.nodeCount;
    }

    _snapshotTree(node = this.root) {
        if (!node) return null;
        return {
            value: node.value,
            color: node.color,
            left: this._snapshotTree(node.left),
            right: this._snapshotTree(node.right),
        };
    }

    _emit(recorder, event) {
        if (typeof recorder !== 'function') return;
        recorder({
            operation: event.operation,
            explanation: event.explanation,
            involved: event.involved || [],
            roles: event.roles || {},
            property: event.property || null,
            snapshot: this._snapshotTree(),
        });
    }

    _roleValues(current, parent, grandparent, uncle, sibling, nearChild, farChild) {
        return Object.fromEntries(
            Object.entries({ current, parent, grandparent, uncle, sibling, nearChild, farChild })
                .map(([role, node]) => [role, node ? node.value : null]),
        );
    }

    _rotateLeft(x) {
        const y = x.right;
        x.right = y.left;
        if (y.left) y.left.parent = x;
        y.parent = x.parent;
        if (!x.parent) this.root = y;
        else if (x === x.parent.left) x.parent.left = y;
        else x.parent.right = y;
        y.left = x;
        x.parent = y;
    }

    _rotateRight(x) {
        const y = x.left;
        x.left = y.right;
        if (y.right) y.right.parent = x;
        y.parent = x.parent;
        if (!x.parent) this.root = y;
        else if (x === x.parent.right) x.parent.right = y;
        else x.parent.left = y;
        y.right = x;
        x.parent = y;
    }

    insert(value, recorder = null) {
        this._emit(recorder, {
            operation: `Insert ${value}`,
            explanation: `Start inserting ${value}. Follow the binary-search-tree ordering to find its position.`,
            involved: [value],
            roles: { current: null },
        });

        let parent = null;
        let current = this.root;
        while (current) {
            parent = current;
            this._emit(recorder, {
                operation: `Compare with ${current.value}`,
                explanation: `${value} is ${value < current.value ? 'less' : 'greater'} than ${current.value}, so continue ${value < current.value ? 'left' : 'right'}.`,
                involved: [value, current.value],
                roles: { current: current.value },
            });
            if (value === current.value) {
                this._emit(recorder, {
                    operation: 'Duplicate ignored',
                    explanation: `The tree already contains ${value}. This implementation ignores duplicate values, so the tree is unchanged.`,
                    involved: [value],
                    roles: { current: value },
                    property: this.validateProperties().valid ? 'all' : null,
                });
                return;
            }
            current = value < current.value ? current.left : current.right;
        }

        const node = new RedBlackNode(value);
        node.color = RED;
        node.parent = parent;
        if (!parent) this.root = node;
        else if (value < parent.value) parent.left = node;
        else parent.right = node;
        this.nodeCount++;

        this._emit(recorder, {
            operation: `Insert ${value} as red`,
            explanation: `Place ${value} in its binary-search-tree position. New nodes start red so they do not add an extra black node to every path.`,
            involved: [value, ...(parent ? [parent.value] : [])],
            roles: { current: value, parent: parent ? parent.value : null },
            property: parent ? null : 2,
        });

        this._insertFixup(node, recorder);
        const validation = this.validateProperties();
        this._emit(recorder, {
            operation: validation.valid ? 'Balanced tree' : 'Tree validation failed',
            explanation: validation.valid
                ? 'Insertion is complete. The root is black, red nodes have no red children, and every root-to-NIL path has equal black height.'
                : `Insertion ended with a property check failure: ${validation.violations.join(' ')}`,
            involved: [this.root ? this.root.value : value],
            roles: { current: this.root ? this.root.value : value },
            property: validation.valid ? 'all' : null,
        });
    }

    _insertFixup(node, recorder) {
        let current = node;

        while (current.parent && current.parent.color === RED) {
            const parent = current.parent;
            const grandparent = parent.parent;

            if (parent === grandparent.left) {
                const uncle = grandparent.right;
                this._emit(recorder, {
                    operation: 'Red-red violation',
                    explanation: `Both ${parent.value} and ${current.value} are red. A red node cannot have a red child, so the grandparent and uncle must be checked.`,
                    involved: [current.value, parent.value, grandparent.value, ...(uncle ? [uncle.value] : [])],
                    roles: this._roleValues(current, parent, grandparent, uncle),
                    property: 4,
                });

                if (this._colorOf(uncle) === RED) {
                    parent.color = BLACK;
                    uncle.color = BLACK;
                    grandparent.color = RED;
                    this._emit(recorder, {
                        operation: 'Recolor parent and uncle',
                        explanation: `The uncle ${uncle.value} is red. Color ${parent.value} and ${uncle.value} black, and color ${grandparent.value} red; the check may continue higher in the tree.`,
                        involved: [parent.value, uncle.value, grandparent.value],
                        roles: this._roleValues(current, parent, grandparent, uncle),
                        property: 4,
                    });
                    current = grandparent;
                } else {
                    if (current === parent.right) {
                        current = parent;
                        this._rotateLeft(current);
                        this._emit(recorder, {
                            operation: 'Left rotation (inner case)',
                            explanation: `This is a left-right insertion. Rotate left at ${current.value} to convert it into the left-left case.`,
                            involved: [current.value, current.parent.value],
                            roles: this._roleValues(current, current.parent, grandparent),
                        });
                    }

                    current.parent.color = BLACK;
                    current.parent.parent.color = RED;
                    const pivot = current.parent.parent;
                    this._rotateRight(pivot);
                    this._emit(recorder, {
                        operation: 'Right rotation (outer case)',
                        explanation: `Rotate right at ${pivot.value}. This restores balance while preserving the binary-search-tree order.`,
                        involved: [pivot.value, pivot.parent.value],
                        roles: this._roleValues(current, current.parent, pivot),
                    });
                }
            } else {
                const uncle = grandparent.left;
                this._emit(recorder, {
                    operation: 'Red-red violation',
                    explanation: `Both ${parent.value} and ${current.value} are red. Check the mirrored case on the right side of ${grandparent.value}.`,
                    involved: [current.value, parent.value, grandparent.value, ...(uncle ? [uncle.value] : [])],
                    roles: this._roleValues(current, parent, grandparent, uncle),
                    property: 4,
                });

                if (this._colorOf(uncle) === RED) {
                    parent.color = BLACK;
                    uncle.color = BLACK;
                    grandparent.color = RED;
                    this._emit(recorder, {
                        operation: 'Recolor parent and uncle',
                        explanation: `The uncle ${uncle.value} is red. Color ${parent.value} and ${uncle.value} black, and color ${grandparent.value} red; the check may continue higher in the tree.`,
                        involved: [parent.value, uncle.value, grandparent.value],
                        roles: this._roleValues(current, parent, grandparent, uncle),
                        property: 4,
                    });
                    current = grandparent;
                } else {
                    if (current === parent.left) {
                        current = parent;
                        this._rotateRight(current);
                        this._emit(recorder, {
                            operation: 'Right rotation (inner case)',
                            explanation: `This is a right-left insertion. Rotate right at ${current.value} to convert it into the right-right case.`,
                            involved: [current.value, current.parent.value],
                            roles: this._roleValues(current, current.parent, grandparent),
                        });
                    }

                    current.parent.color = BLACK;
                    current.parent.parent.color = RED;
                    const pivot = current.parent.parent;
                    this._rotateLeft(pivot);
                    this._emit(recorder, {
                        operation: 'Left rotation (outer case)',
                        explanation: `Rotate left at ${pivot.value}. This restores balance while preserving the binary-search-tree order.`,
                        involved: [pivot.value, pivot.parent.value],
                        roles: this._roleValues(current, current.parent, pivot),
                    });
                }
            }
        }

        if (this.root && this.root.color !== BLACK) {
            this.root.color = BLACK;
            this._emit(recorder, {
                operation: 'Color root black',
                explanation: 'The root must always be black, so color it black before finishing.',
                involved: [this.root.value],
                roles: { current: this.root.value },
                property: 2,
            });
        }
    }

    _minimum(node) {
        let current = node;
        while (current.left) current = current.left;
        return current;
    }

    _transplant(oldNode, newNode) {
        if (!oldNode.parent) this.root = newNode;
        else if (oldNode === oldNode.parent.left) oldNode.parent.left = newNode;
        else oldNode.parent.right = newNode;
        if (newNode) newNode.parent = oldNode.parent;
    }

    _deleteFixup(node, parent, recorder) {
        let current = node;
        let currentParent = parent;

        while (current !== this.root && this._colorOf(current) === BLACK) {
            if (!currentParent) break;

            if (current === currentParent.left) {
                let sibling = currentParent.right;
                if (this._colorOf(sibling) === RED) {
                    this._emit(recorder, {
                        operation: 'Deletion fix: red sibling',
                        explanation: `The sibling ${sibling.value} is red. Recolor it black and the parent red, then rotate left to expose a black sibling.`,
                        involved: [currentParent.value, sibling.value],
                        roles: this._roleValues(current, currentParent, null, null, sibling),
                    });
                    sibling.color = BLACK;
                    currentParent.color = RED;
                    this._rotateLeft(currentParent);
                    this._emit(recorder, {
                        operation: 'Left rotation at parent',
                        explanation: `Rotate left at ${currentParent.value}; continue deletion repair with the new sibling.`,
                        involved: [currentParent.value, currentParent.parent.value],
                        roles: this._roleValues(current, currentParent, null, null, currentParent.right),
                    });
                    sibling = currentParent.right;
                }

                if (this._colorOf(sibling ? sibling.left : null) === BLACK
                    && this._colorOf(sibling ? sibling.right : null) === BLACK) {
                    this._emit(recorder, {
                        operation: 'Deletion fix: black sibling with black children',
                        explanation: sibling
                            ? `Sibling ${sibling.value} and both of its children are black. Color the sibling red and move the extra blackness up to the parent.`
                            : `The sibling is a NIL leaf (black), and its children are also NIL leaves. Move the extra blackness up to the parent.`,
                        involved: [currentParent.value, ...(sibling ? [sibling.value] : [])],
                        roles: this._roleValues(current, currentParent, null, null, sibling),
                        property: 5,
                    });
                    if (sibling) sibling.color = RED;
                    current = currentParent;
                    currentParent = current.parent;
                } else {
                    if (this._colorOf(sibling ? sibling.right : null) === BLACK) {
                        this._emit(recorder, {
                            operation: 'Deletion fix: red near child',
                            explanation: `The sibling's near child is red but its far child is black. Recolor and rotate the sibling to turn the near child into a far child.`,
                            involved: [currentParent.value, sibling.value, sibling.left.value],
                            roles: this._roleValues(current, currentParent, null, null, sibling, sibling.left, sibling.right),
                        });
                        sibling.left.color = BLACK;
                        sibling.color = RED;
                        this._rotateRight(sibling);
                        sibling = currentParent.right;
                        this._emit(recorder, {
                            operation: 'Right rotation at sibling',
                            explanation: 'The near-child case is now converted to the far-child case.',
                            involved: [sibling.parent.value, sibling.value],
                            roles: this._roleValues(current, currentParent, null, null, sibling, sibling.left, sibling.right),
                        });
                    }

                    this._emit(recorder, {
                        operation: 'Deletion fix: red far child',
                        explanation: `The sibling has a red far child. Copy the parent's color to the sibling, blacken the parent and far child, then rotate left to restore black height.`,
                        involved: [currentParent.value, sibling.value, ...(sibling.right ? [sibling.right.value] : [])],
                        roles: this._roleValues(current, currentParent, null, null, sibling, sibling.left, sibling.right),
                    });
                    sibling.color = currentParent.color;
                    currentParent.color = BLACK;
                    if (sibling.right) sibling.right.color = BLACK;
                    this._rotateLeft(currentParent);
                    this._emit(recorder, {
                        operation: 'Left rotation completes deletion repair',
                        explanation: 'The rotation redistributes the black height. The extra blackness is resolved.',
                        involved: [currentParent.value, currentParent.parent.value],
                        roles: this._roleValues(currentParent.parent, currentParent, null, null, sibling),
                    });
                    current = this.root;
                    currentParent = null;
                }
            } else {
                let sibling = currentParent.left;
                if (this._colorOf(sibling) === RED) {
                    this._emit(recorder, {
                        operation: 'Deletion fix: red sibling (mirror)',
                        explanation: `The sibling ${sibling.value} is red on the mirrored side. Recolor it black and the parent red, then rotate right to expose a black sibling.`,
                        involved: [currentParent.value, sibling.value],
                        roles: this._roleValues(current, currentParent, null, null, sibling),
                    });
                    sibling.color = BLACK;
                    currentParent.color = RED;
                    this._rotateRight(currentParent);
                    this._emit(recorder, {
                        operation: 'Right rotation at parent',
                        explanation: `Rotate right at ${currentParent.value}; continue deletion repair with the new sibling.`,
                        involved: [currentParent.value, currentParent.parent.value],
                        roles: this._roleValues(current, currentParent, null, null, currentParent.left),
                    });
                    sibling = currentParent.left;
                }

                if (this._colorOf(sibling ? sibling.right : null) === BLACK
                    && this._colorOf(sibling ? sibling.left : null) === BLACK) {
                    this._emit(recorder, {
                        operation: 'Deletion fix: black sibling with black children (mirror)',
                        explanation: sibling
                            ? `Sibling ${sibling.value} and both of its children are black. Color the sibling red and move the extra blackness up to the parent.`
                            : `The sibling is a NIL leaf (black), and its children are also NIL leaves. Move the extra blackness up to the parent.`,
                        involved: [currentParent.value, ...(sibling ? [sibling.value] : [])],
                        roles: this._roleValues(current, currentParent, null, null, sibling),
                        property: 5,
                    });
                    if (sibling) sibling.color = RED;
                    current = currentParent;
                    currentParent = current.parent;
                } else {
                    if (this._colorOf(sibling ? sibling.left : null) === BLACK) {
                        this._emit(recorder, {
                            operation: 'Deletion fix: red near child (mirror)',
                            explanation: `The sibling's near child is red but its far child is black. Recolor and rotate the sibling to turn the near child into a far child.`,
                            involved: [currentParent.value, sibling.value, sibling.right.value],
                            roles: this._roleValues(current, currentParent, null, null, sibling, sibling.right, sibling.left),
                        });
                        sibling.right.color = BLACK;
                        sibling.color = RED;
                        this._rotateLeft(sibling);
                        sibling = currentParent.left;
                        this._emit(recorder, {
                            operation: 'Left rotation at sibling',
                            explanation: 'The mirrored near-child case is now converted to the far-child case.',
                            involved: [sibling.parent.value, sibling.value],
                            roles: this._roleValues(current, currentParent, null, null, sibling, sibling.right, sibling.left),
                        });
                    }

                    this._emit(recorder, {
                        operation: 'Deletion fix: red far child (mirror)',
                        explanation: `The sibling has a red far child. Copy the parent's color to the sibling, blacken the parent and far child, then rotate right to restore black height.`,
                        involved: [currentParent.value, sibling.value, ...(sibling.left ? [sibling.left.value] : [])],
                        roles: this._roleValues(current, currentParent, null, null, sibling, sibling.right, sibling.left),
                    });
                    sibling.color = currentParent.color;
                    currentParent.color = BLACK;
                    if (sibling.left) sibling.left.color = BLACK;
                    this._rotateRight(currentParent);
                    this._emit(recorder, {
                        operation: 'Right rotation completes deletion repair',
                        explanation: 'The mirrored rotation redistributes the black height. The extra blackness is resolved.',
                        involved: [currentParent.value, currentParent.parent.value],
                        roles: this._roleValues(currentParent.parent, currentParent, null, null, sibling),
                    });
                    current = this.root;
                    currentParent = null;
                }
            }
        }

        if (current && current.color !== BLACK) {
            current.color = BLACK;
            this._emit(recorder, {
                operation: 'Resolve extra blackness',
                explanation: `Color ${current.value} black. The missing black node is restored without another rotation.`,
                involved: [current.value],
                roles: { current: current.value },
                property: 5,
            });
        }
    }

    delete(value, recorder = null) {
        this._emit(recorder, {
            operation: `Search for ${value}`,
            explanation: `Search for ${value} using the binary-search-tree ordering.`,
            involved: [value],
            roles: { current: null },
        });
        let target = this.root;
        while (target && target.value !== value) {
            this._emit(recorder, {
                operation: `Compare with ${target.value}`,
                explanation: `${value} is ${value < target.value ? 'less' : 'greater'} than ${target.value}, so continue ${value < target.value ? 'left' : 'right'}.`,
                involved: [value, target.value],
                roles: { current: target.value },
            });
            target = value < target.value ? target.left : target.right;
        }

        if (!target) {
            this._emit(recorder, {
                operation: 'Value not found',
                explanation: `${value} is not in the tree, so no nodes are changed.`,
                involved: [value],
                property: this.validateProperties().valid ? 'all' : null,
            });
            return;
        }

        this._emit(recorder, {
            operation: `Found ${value}`,
            explanation: `Found ${value}. It has ${target.left && target.right ? 'two children' : target.left || target.right ? 'one child' : 'no children'}, so the matching deletion case is selected.`,
            involved: [value],
            roles: { current: value, target: value },
        });

        let moved = target;
        let removedColor = moved.color;
        let fixNode;
        let fixParent;

        if (!target.left) {
            fixNode = target.right;
            fixParent = target.parent;
            this._transplant(target, target.right);
            if (fixNode) fixParent = fixNode.parent;
        } else if (!target.right) {
            fixNode = target.left;
            fixParent = target.parent;
            this._transplant(target, target.left);
            if (fixNode) fixParent = fixNode.parent;
        } else {
            moved = this._minimum(target.right);
            removedColor = moved.color;
            fixNode = moved.right;
            this._emit(recorder, {
                operation: `Use successor ${moved.value}`,
                explanation: `${value} has two children. Use its in-order successor ${moved.value} (the smallest value in its right subtree) to preserve search-tree ordering.`,
                involved: [value, moved.value],
                roles: { target: value, current: moved.value, successor: moved.value },
            });
            if (moved.parent === target) {
                fixParent = moved;
                if (fixNode) fixNode.parent = moved;
            } else {
                fixParent = moved.parent;
                this._transplant(moved, moved.right);
                moved.right = target.right;
                moved.right.parent = moved;
            }
            this._transplant(target, moved);
            moved.left = target.left;
            moved.left.parent = moved;
            moved.color = target.color;
        }

        this.nodeCount--;
        this._emit(recorder, {
            operation: `Remove ${value}`,
            explanation: `Remove ${value} from its position. ${removedColor === BLACK ? 'A black node was removed, so the tree may need a black-height repair.' : 'The removed node was red, so black height is unchanged.'}`,
            involved: [value, ...(moved !== target ? [moved.value] : [])],
            roles: { target: value, current: moved !== target ? moved.value : value },
            property: removedColor === BLACK ? 5 : null,
        });

        if (removedColor === BLACK) {
            this._emit(recorder, {
                operation: 'Begin deletion repair',
                explanation: 'A black node was removed. Repair any extra blackness so every path to a NIL leaf still has the same number of black nodes.',
                involved: [fixParent ? fixParent.value : null].filter((item) => item !== null),
                roles: { current: fixNode ? fixNode.value : null, parent: fixParent ? fixParent.value : null },
                property: 5,
            });
            this._deleteFixup(fixNode, fixParent, recorder);
        }

        if (this.root) {
            this.root.color = BLACK;
            this.root.parent = null;
        }
        const validation = this.validateProperties();
        this._emit(recorder, {
            operation: validation.valid ? 'Balanced tree' : 'Tree validation failed',
            explanation: validation.valid
                ? 'Deletion is complete. The root is black, red nodes have no red children, and all root-to-NIL paths have equal black height.'
                : `Deletion ended with a property check failure: ${validation.violations.join(' ')}`,
            involved: [this.root ? this.root.value : value],
            roles: { current: this.root ? this.root.value : null },
            property: validation.valid ? 'all' : null,
        });
    }

    validateProperties() {
        const violations = [];
        if (this.root && this.root.parent) violations.push('The root must not have a parent.');
        if (this.root && this.root.color !== BLACK) violations.push('The root must be black.');

        let reachableCount = 0;
        const inspect = (node, parent, min, max) => {
            if (!node) return 1;
            reachableCount++;
            if (node.parent !== parent) violations.push(`Parent link is incorrect at ${node.value}.`);
            if (node.color !== RED && node.color !== BLACK) violations.push(`Node ${node.value} has an invalid color.`);
            if (min !== null && node.value <= min) violations.push(`BST ordering is invalid at ${node.value}.`);
            if (max !== null && node.value >= max) violations.push(`BST ordering is invalid at ${node.value}.`);
            if (node.color === RED && (this._colorOf(node.left) === RED || this._colorOf(node.right) === RED)) {
                violations.push(`Red node ${node.value} has a red child.`);
            }

            const leftHeight = inspect(node.left, node, min, node.value);
            const rightHeight = inspect(node.right, node, node.value, max);
            if (leftHeight !== rightHeight) violations.push(`Black height differs below ${node.value}.`);
            return Math.min(leftHeight, rightHeight) + (node.color === BLACK ? 1 : 0);
        };

        inspect(this.root, null, null, null);
        if (reachableCount !== this.nodeCount) violations.push(`Node count is ${this.nodeCount}, but ${reachableCount} nodes are reachable.`);
        return { valid: violations.length === 0, violations };
    }
}

export default RedBlackTree;
