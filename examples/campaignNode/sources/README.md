The source files for these maps are quite different from what you're used to. I don't actually use the builtin map editor in Celaria but instead use BrickBuilder to build these maps.

For each map there are two files, one is a .brk containing the blocks and the .ecmap containing only the objects. .brk files are converted using a .brk to .ecmap converter https://bunnynabbit.ddns.net/tool/brk2ecmap/ and then merged with the objects.ecmap file using the ecmap combiner https://bunnynabbit.ddns.net/tool/ecmap-combiner/
This creates a .ecmap which is used to verify and create the final .cmap file