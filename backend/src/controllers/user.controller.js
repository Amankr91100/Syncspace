import asyncHandler from '../utils/asyncHandler.js';

/** Members of a workspace — used to fill assignee and mention pickers. */
export const workspaceMembers = asyncHandler(async (req, res) => {
  await req.workspace.populate('members.user', 'name email avatar title');
  res.json(req.workspace.members);
});
